// src/jobs/loanDeadlineJob.js
//
// Job diário: percorre as prestações em aberto de todos os empréstimos activos/vencidos e
// dispara os eventos de notificação relevantes (lembrete de vencimento, prestação vencida,
// início de juros de mora). NUNCA calcula mora aqui — reutiliza applyLateFeesForLoan (o mesmo
// motor de payments.js/loanAccounting.js) para trazer cada empréstimo em dia antes de decidir o
// que notificar; este job só interpreta o resultado e comunica-o através do
// NotificationService, tal como qualquer outro trigger.
//
// Idempotência: cada evento potencial tem uma dedupeKey (loan+prestação+evento+marco) gravada
// em NotificationLog.metadata.data.__dedupeKey; antes de disparar, verifica-se se já existe um
// log com essa chave — o job pode correr quantas vezes for preciso no mesmo dia (ou ser
// reiniciado) sem nunca reenviar a mesma notificação.

const { Op } = require('sequelize');
const { Loan, LoanApplication, CreditProduct, PaymentSchedule, Client, User, NotificationLog } = require('../models');
const { triggerEvent } = require('../services/notification/notificationService');
const { startOfDay, daysBetween, lateInterestStartDate, round2 } = require('../services/loanAccounting');
const logger = require('../utils/logger');

// Configurável por ambiente, sem exigir alterações de código: dias antes do vencimento em que
// se envia um lembrete, e dias em atraso em que se envia um novo aviso de mora (marcos, não
// diário — evita spam).
const REMINDER_OFFSETS = parseOffsets(process.env.PAYMENT_REMINDER_DAYS, [7, 3, 1, 0]);
const ARREARS_MILESTONES = parseOffsets(process.env.ARREARS_REMINDER_DAYS, [1, 3, 7, 15, 30]);

function parseOffsets(raw, fallback) {
  if (!raw) return fallback;
  const parsed = String(raw).split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite);
  return parsed.length ? parsed : fallback;
}

function mzn(v) {
  return `${Number(v || 0).toLocaleString('pt-MZ')} MZN`;
}

function fmtDate(d) {
  return startOfDay(d).toLocaleDateString('pt-MZ');
}

async function alreadyNotified(dedupeKey) {
  const existing = await NotificationLog.findOne({
    where: { metadata: { [Op.contains]: { data: { __dedupeKey: dedupeKey } } } },
  });
  return !!existing;
}

async function fireOnce(event, dedupeKey, { institutionId, clientId, recipientEmail, recipientPhone, data }) {
  if (await alreadyNotified(dedupeKey)) return false;
  await triggerEvent(event, { institutionId, clientId, recipientEmail, recipientPhone, data: { ...data, __dedupeKey: dedupeKey } });
  return true;
}

// Processa UM empréstimo: traz a mora em dia (delegado — nunca recalculado aqui) e decide, por
// prestação em aberto, que eventos disparar hoje.
async function processLoan(loan, today) {
  const { applyLateFeesForLoan } = require('../routes/payments'); // lazy require: evita ciclo payments<->job
  await applyLateFeesForLoan(loan.id, today);

  const product = loan.LoanApplication?.CreditProduct;
  const graceDays = Number(product?.grace_period_days ?? 0);
  const reference = loan.LoanApplication?.reference || loan.id;
  const client = loan.LoanApplication?.Client;
  const user = client?.User;
  if (!user) return { reminders: 0, overdue: 0, lateFeeStarted: 0 };

  const schedules = await PaymentSchedule.findAll({
    where: { loan_id: loan.id, status: { [Op.in]: ['pending', 'partial', 'overdue'] } },
    order: [['due_date', 'ASC']],
  });

  const recipient = { institutionId: loan.institution_id, clientId: client.id, recipientEmail: user.email, recipientPhone: user.phone };
  let reminders = 0, overdue = 0, lateFeeStarted = 0;

  for (const schedule of schedules) {
    const dueDate = new Date(schedule.due_date);
    const balance = round2(Number(schedule.total_due || 0) + Number(schedule.late_fee || 0) - Number(schedule.total_paid || 0));
    const daysToDue = daysBetween(today, dueDate);
    const isPastDue = startOfDay(today) > startOfDay(dueDate);

    // 1) Lembrete de vencimento próximo (só antes de vencer).
    if (!isPastDue && REMINDER_OFFSETS.includes(daysToDue)) {
      const dedupeKey = `${loan.id}:${schedule.id}:payment_due_reminder:day${daysToDue}`;
      const sent = await fireOnce('payment_due_reminder', dedupeKey, {
        ...recipient,
        data: { clientName: user.full_name, installmentAmount: mzn(balance), dueDate: fmtDate(dueDate), daysRemaining: daysToDue, reference },
      });
      if (sent) reminders++;
    }

    if (isPastDue) {
      const daysOverdue = daysBetween(dueDate, today);

      // 2) Prestação vencida — avisos em marcos (1/3/7/15/30 dias), nunca diário.
      if (ARREARS_MILESTONES.includes(daysOverdue)) {
        const dedupeKey = `${loan.id}:${schedule.id}:loan_overdue:day${daysOverdue}`;
        const sent = await fireOnce('loan_overdue', dedupeKey, {
          ...recipient,
          data: { clientName: user.full_name, reference, dueDate: fmtDate(dueDate), daysOverdue, balance: mzn(balance), lateFee: mzn(schedule.late_fee) },
        });
        if (sent) overdue++;
      }

      // 3) Início dos juros de mora — uma única vez, no dia exacto em que o período de
      // tolerância termina (nunca antes disso, respeitando grace_period_days do produto).
      const graceEnd = lateInterestStartDate(dueDate, graceDays);
      if (startOfDay(today).getTime() === startOfDay(graceEnd).getTime()) {
        const dedupeKey = `${loan.id}:${schedule.id}:late_fee_started`;
        const sent = await fireOnce('late_fee_started', dedupeKey, {
          ...recipient,
          data: { clientName: user.full_name, reference, dueDate: fmtDate(dueDate), lateInterestStartDate: fmtDate(graceEnd), balance: mzn(balance), lateInterest: mzn(schedule.late_fee) },
        });
        if (sent) lateFeeStarted++;
      }
    }
  }

  return { reminders, overdue, lateFeeStarted };
}

async function runLoanDeadlineJob(today = new Date()) {
  const loans = await Loan.findAll({
    where: { status: { [Op.in]: ['active', 'overdue'] } },
    include: [
      { model: LoanApplication, include: [CreditProduct, { model: Client, include: [User] }] },
    ],
  });

  const totals = { loans: loans.length, reminders: 0, overdue: 0, lateFeeStarted: 0, errors: 0 };
  for (const loan of loans) {
    try {
      const r = await processLoan(loan, today);
      totals.reminders += r.reminders;
      totals.overdue += r.overdue;
      totals.lateFeeStarted += r.lateFeeStarted;
    } catch (err) {
      totals.errors++;
      logger.error('loanDeadlineJob: falha ao processar empréstimo', { loanId: loan.id, error: err.message });
    }
  }

  logger.info('loanDeadlineJob concluído', totals);
  return totals;
}

module.exports = { runLoanDeadlineJob, REMINDER_OFFSETS, ARREARS_MILESTONES };
