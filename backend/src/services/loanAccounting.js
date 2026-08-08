// src/services/loanAccounting.js
//
// Regras de negócio de imputação de pagamentos e juros de mora — em funções PURAS, sem
// qualquer acesso à base de dados. Isto permite testar matematicamente o comportamento
// (ver tests/loanAccounting.test.js) e garante que o mesmo código é usado tanto para um
// pagamento novo em tempo real como para o replay cronológico de um empréstimo antigo.
//
// Regra central: uma prestação só fica PAGA quando Capital + Juros + Mora acumulada até à
// data de liquidação estiver 100% coberta. Mora é sempre calculada de forma incremental,
// desde o último "checkpoint" (late_fee_accrued_through) até à data do evento — nunca é
// recalculada do zero, para que mora já vencida nunca desapareça quando um pagamento
// parcial reduz o capital+juros em dívida.

const PAID_TOLERANCE = 1; // 1 MZN — a UI só mostra Meticais inteiros (ver payments.js)

function round2(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(from, to) {
  return Math.max(0, Math.floor((startOfDay(to) - startOfDay(from)) / 86400000));
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Data a partir da qual a mora efectivamente começa a contar: vencimento + período de
// tolerância do produto (grace_period_days). Com graceDays=0 (produto sem tolerância
// configurada) isto é exactamente a data de vencimento, tal como já era antes desta função
// existir — comportamento antigo preservado por omissão.
function lateInterestStartDate(dueDate, graceDays = 0) {
  return graceDays > 0 ? addDays(dueDate, graceDays) : new Date(dueDate);
}

// Acresce (nunca substitui) a mora de UMA prestação desde o último checkpoint até `asOf`,
// usando como base o capital+juros ainda não coberto por pagamentos (total_due - total_paid),
// tal como a fórmula/percentagem já configurada no produto (rate = taxa diária). Uma vez que
// total_paid cubra o total_due, a base fica em 0 e deixa de acrescer NOVA mora — a mora já
// acumulada até aí fica registada e só é "perdoada" se for efectivamente paga.
// graceDays desloca o início da contagem (vencimento + tolerância), respeitando
// CreditProduct.grace_period_days — nunca antes disso, mesmo que a prestação já esteja
// tecnicamente vencida.
function accrueLateFee(schedule, rate, asOf, graceDays = 0) {
  const dueDate = new Date(schedule.due_date);
  const graceEnd = lateInterestStartDate(dueDate, graceDays);
  const checkpoint = schedule.late_fee_accrued_through ? new Date(schedule.late_fee_accrued_through) : graceEnd;
  const from = checkpoint > graceEnd ? checkpoint : graceEnd;
  const currentFee = round2(schedule.late_fee || 0);

  if (!rate || rate <= 0) return { late_fee: currentFee, late_fee_accrued_through: schedule.late_fee_accrued_through || null };
  if (startOfDay(asOf) <= startOfDay(from)) return { late_fee: currentFee, late_fee_accrued_through: schedule.late_fee_accrued_through || null };

  const days = daysBetween(from, asOf);
  if (days <= 0) return { late_fee: currentFee, late_fee_accrued_through: schedule.late_fee_accrued_through || null };

  const base = Math.max(round2(schedule.total_due) - round2(schedule.total_paid), 0);
  const newAccrual = round2(base * rate * days);
  return {
    late_fee: round2(currentFee + newAccrual),
    late_fee_accrued_through: asOf,
  };
}

// Aplica um pagamento (amount, na data asOf) contra a lista de prestações de um empréstimo,
// FIFO por due_date. Antes de tentar liquidar cada prestação, traz a mora dela em dia até
// asOf. Só avança para a prestação seguinte quando a actual fica 100% coberta (capital+
// juros+mora); caso contrário TODO o valor fica retido nela, mesmo que ultrapasse o valor
// originalmente previsto para essa prestação.
//
// Devolve: { schedules: [...copia actualizada...], allocations: [{schedule_id, amount}],
// unallocated: valor que sobrou depois de cobrir todas as prestações em aberto (excedente/
// adiantamento — nunca é descartado silenciosamente). schedules deve vir ordenado ou não,
// a função ordena internamente por due_date.
function applyPaymentToSchedules(schedules, amount, asOf, rate, graceDays = 0) {
  let amountLeft = round2(amount);
  const ordered = [...schedules]
    .map(s => ({ ...s }))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const allocations = [];

  for (const schedule of ordered) {
    if (amountLeft <= 0) break;
    if (!['pending', 'partial', 'overdue'].includes(schedule.status)) continue;

    const accrual = accrueLateFee(schedule, rate, asOf, graceDays);
    schedule.late_fee = accrual.late_fee;
    schedule.late_fee_accrued_through = accrual.late_fee_accrued_through;

    const dueWithLate = round2(Number(schedule.total_due || 0) + Number(schedule.late_fee || 0));
    const remaining = Math.max(round2(dueWithLate - Number(schedule.total_paid || 0)), 0);

    if (remaining <= PAID_TOLERANCE) {
      // Já estava coberta (ex.: só faltava arredondamento) — fecha sem consumir o pagamento.
      schedule.status = 'paid';
      schedule.paid_at = schedule.paid_at || asOf;
      continue;
    }

    const pay = Math.min(amountLeft, remaining);
    schedule.total_paid = round2(Number(schedule.total_paid || 0) + pay);
    amountLeft = round2(amountLeft - pay);
    allocations.push({ schedule_id: schedule.id, amount: pay });

    const stillOwed = round2(dueWithLate - schedule.total_paid);
    if (stillOwed <= PAID_TOLERANCE) {
      schedule.status = 'paid';
      schedule.paid_at = asOf;
    } else {
      schedule.status = 'partial';
    }
  }

  return { schedules: ordered, allocations, unallocated: amountLeft };
}

// Passagem de "apenas acrescer mora" (sem pagamento associado) — usada para trazer prestações
// em aberto/vencidas em dia até uma data de referência (ex.: "hoje", quando a página é
// consultada, ou como último passo depois de reproduzir todo o histórico de transacções).
function accrueOpenSchedules(schedules, rate, asOf, graceDays = 0) {
  return schedules.map(s => {
    const schedule = { ...s };
    if (!['pending', 'partial', 'overdue'].includes(schedule.status)) return schedule;
    const graceEnd = lateInterestStartDate(new Date(schedule.due_date), graceDays);
    if (graceEnd >= startOfDay(asOf)) return schedule; // ainda não venceu / dentro da tolerância
    const accrual = accrueLateFee(schedule, rate, asOf, graceDays);
    schedule.late_fee = accrual.late_fee;
    schedule.late_fee_accrued_through = accrual.late_fee_accrued_through;
    const dueWithLate = round2(Number(schedule.total_due || 0) + Number(schedule.late_fee || 0));
    const remaining = Math.max(round2(dueWithLate - Number(schedule.total_paid || 0)), 0);
    schedule.status = remaining <= PAID_TOLERANCE ? 'paid' : 'overdue';
    if (schedule.status === 'paid') schedule.paid_at = schedule.paid_at || asOf;
    return schedule;
  });
}

// Replay cronológico completo: parte de prestações "limpas" (total_paid=0, late_fee=0,
// status='pending') e reproduz, por ordem de data/hora, cada transacção confirmada — trazendo
// a mora em dia à data de CADA transacção antes de a alocar. No fim, acresce mora até `today`
// para qualquer prestação vencida ainda em aberto. Devolve o estado final das prestações e o
// mapa completo de alocações (transaction_id -> [{schedule_id, amount}]) para auditoria.
function replayLoan(pristineSchedules, transactions, rate, today = new Date(), graceDays = 0) {
  let schedules = pristineSchedules.map(s => ({
    ...s,
    total_paid: 0,
    late_fee: 0,
    late_fee_accrued_through: null,
    status: 'pending',
    paid_at: null,
  }));
  const allocationsByTx = {};
  const unallocatedByTx = {};

  const sorted = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  for (const tx of sorted) {
    const asOf = new Date(tx.created_at);
    const { schedules: after, allocations, unallocated } = applyPaymentToSchedules(schedules, tx.amount, asOf, rate, graceDays);
    schedules = after;
    allocationsByTx[tx.id] = allocations;
    if (unallocated > 0) unallocatedByTx[tx.id] = unallocated;
  }

  schedules = accrueOpenSchedules(schedules, rate, today, graceDays);

  return { schedules, allocationsByTx, unallocatedByTx };
}

module.exports = {
  PAID_TOLERANCE,
  round2,
  startOfDay,
  daysBetween,
  lateInterestStartDate,
  accrueLateFee,
  applyPaymentToSchedules,
  accrueOpenSchedules,
  replayLoan,
};
