const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PaymentTransaction, Loan, PaymentSchedule, Client, User, LoanApplication, CreditProduct } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { Op, fn, col, literal } = require('sequelize');
const { notifyAffectedUser } = require('../services/userActionNotifier');

const receiptDir = path.join(__dirname, '..', '..', 'uploads', 'receipts');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => { if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true }); cb(null, receiptDir); },
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 } });

async function assertLoanAccess(req, loan) {
  if (!loan) return false;
  if (req.user.role === 'super_admin') return true;
  if (['inst_admin','inst_agent'].includes(req.user.role)) return loan.institution_id === req.user.institution_id;
  if (req.user.role === 'client') {
    const client = await Client.findOne({ where: { user_id: req.user.id } });
    return client?.id === loan.client_id;
  }
  return false;
}

function monthKey(date = new Date()) { return date.toISOString().slice(0,7); }
function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d){ const x=startOfDay(d); const day=x.getDay()||7; x.setDate(x.getDate()-day+1); return x; }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d){ return new Date(d.getFullYear(), 0, 1); }

// A UI só mostra Meticais sem casas decimais (maximumFractionDigits:0), mas os valores
// internamente têm 2 casas decimais. Um pagamento digitado a olhar para o valor arredondado
// pode ficar a cêntimos do valor exacto — sem esta tolerância essa prestação nunca atinge
// 'paid' e fica presa em 'overdue' para sempre, mesmo já estando paga aos olhos do utilizador.
const PAID_TOLERANCE = 1;

async function applyLateFeesForLoan(loanId) {
  const loan = await Loan.findByPk(loanId, { include: [{ model: LoanApplication, include: [CreditProduct] }] });
  if (!loan) return 0;
  const rate = Number(loan.LoanApplication?.CreditProduct?.late_fee_rate ?? 0);
  const today = startOfDay(new Date());
  const schedules = await PaymentSchedule.findAll({
    where: { loan_id: loanId, status: { [Op.in]: ['pending','partial','overdue'] } },
    order: [['due_date','ASC']],
  });
  let totalLate = 0;
  for (const s of schedules) {
    const base = Math.max(Number(s.total_due || 0) - Number(s.total_paid || 0), 0);
    if (base <= PAID_TOLERANCE) {
      // Já paga na prática (resto é apenas arredondamento) — fecha a prestação em vez de a
      // marcar em falta, para não ficar presa indefinidamente com juro de mora zero.
      if (s.status !== 'paid') await s.update({ status: 'paid', paid_at: s.paid_at || new Date(), late_fee: 0 });
      continue;
    }
    if (!rate || rate <= 0) continue;
    const due = startOfDay(new Date(s.due_date));
    if (due >= today) continue;
    const daysLate = Math.max(0, Math.floor((today - due) / 86400000));
    const fee = Math.round(base * rate * daysLate * 100) / 100;
    if (fee > Number(s.late_fee || 0) || s.status !== 'overdue') {
      await s.update({ late_fee: fee, status: 'overdue' });
    }
    totalLate += fee;
  }
  const overdueCount = schedules.filter(s => new Date(s.due_date) < today && s.status !== 'paid').length;
  if (overdueCount > 0 && loan.status === 'active') await loan.update({ status: 'overdue', days_overdue: Math.max(...schedules.map(s => Math.floor((today - startOfDay(new Date(s.due_date))) / 86400000)).filter(n => n > 0), 0) });
  return totalLate;
}

async function applyLateFees(scopeWhere = {}) {
  const loans = await Loan.findAll({ where: { status: { [Op.in]: ['active','overdue'] }, ...scopeWhere }, attributes: ['id'] });
  let total = 0;
  for (const loan of loans) total += await applyLateFeesForLoan(loan.id);
  return total;
}

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const where = { status: 'confirmed' };
    if (req.user.role !== 'super_admin' && req.user.role !== 'client') where.institution_id = req.user.institution_id;
    if (req.user.role === 'client') { const client = await Client.findOne({ where: { user_id: req.user.id } }); where.client_id = client?.id; }
    const now = new Date();
    async function sumBetween(from, to) {
      const result = await PaymentTransaction.findOne({ where: { ...where, created_at: { [Op.between]: [from, to] } }, attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']], raw: true });
      return Number(result?.total || 0);
    }
    const data = {
      today: await sumBetween(startOfDay(now), addDays(startOfDay(now), 1)),
      week: await sumBetween(startOfWeek(now), addDays(now, 1)),
      month: await sumBetween(startOfMonth(now), addDays(now, 1)),
      year: await sumBetween(startOfYear(now), addDays(now, 1)),
    };
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const { loan_id, amount, method, phone_number, external_reference } = req.body;
    if (!external_reference && !phone_number) return res.status(400).json({ success:false, message:'Informe telefone ou referência/comprovativo do pagamento' });
    const loan = await Loan.findByPk(loan_id);
    if (!await assertLoanAccess(req, loan)) return res.status(403).json({ success:false, message:'Acesso negado ao empréstimo' });
    const lateFee = await applyLateFeesForLoan(loan.id);
    const tx = await PaymentTransaction.create({ id: uuidv4(), reference: `PAG-${Date.now().toString().slice(-6)}`, loan_id, client_id: loan.client_id, institution_id: loan.institution_id, amount, method, phone_number, external_reference, status: method === 'mpesa' || method === 'emola' ? 'pending' : 'confirmed', payment_month: monthKey(), registered_by: req.user.id, applied_late_fee: lateFee });
    if (tx.status === 'confirmed') await reconcilePayment(tx, req.user);
    res.json({ success: true, data: tx, message: tx.status === 'confirmed' ? 'Pagamento registado e reconciliado.' : `Aguarde o prompt ${method} no telefone ${phone_number}` });
  } catch (err) { next(err); }
});

router.post('/manual', authenticate, authorize('inst_admin','inst_agent','super_admin'), upload.single('receipt'), audit('payment_registered'), async (req, res, next) => {
  try {
    const { loan_id, amount, method = 'bank_transfer', external_reference, phone_number } = req.body;
    if (!loan_id || !amount || !external_reference) return res.status(400).json({ success:false, message:'Empréstimo, valor e referência são obrigatórios' });
    if (!req.file) return res.status(400).json({ success:false, message:'Comprovativo digitalizado é obrigatório' });
    const loan = await Loan.findByPk(loan_id, { include: [{ model: LoanApplication, include: [{ model: Client, include: [User] }, CreditProduct] }] });
    if (!await assertLoanAccess(req, loan)) return res.status(403).json({ success:false, message:'Acesso negado ao empréstimo' });
    const lateFee = await applyLateFeesForLoan(loan.id);
    const tx = await PaymentTransaction.create({
      id: uuidv4(), reference: `PAG-${Date.now().toString().slice(-6)}`,
      loan_id, client_id: loan.client_id, institution_id: loan.institution_id,
      amount, method, external_reference, phone_number, status: 'confirmed', payment_month: monthKey(), registered_by: req.user.id, applied_late_fee: lateFee,
      receipt_file_name: req.file.filename, receipt_original_name: req.file.originalname, receipt_file_path: req.file.path, receipt_mime_type: req.file.mimetype,
    });
    await reconcilePayment(tx, req.user);
    const clientUser = loan.LoanApplication?.Client?.User;
    await notifyAffectedUser({ user: clientUser, actor: req.user, institutionId: loan.institution_id, action: 'payment_registered', subject: 'Pagamento registado - MicroCredit SYSTEM', body: `<p>Prezado(a) ${clientUser?.full_name || 'Cliente'},</p><p>Foi registado um pagamento de <strong>${amount} MZN</strong> no seu empréstimo.</p><p>Referência: <strong>${external_reference}</strong></p><p>Juros de mora aplicados até à data: <strong>${lateFee} MZN</strong>.</p>`, metadata: { loan_id, payment_id: tx.id } });
    res.status(201).json({ success:true, message:'Pagamento gravado na base de dados e reflectido no empréstimo.', data: tx });
  } catch (err) { next(err); }
});

router.post('/callback/mpesa', async (req, res, next) => {
  try { const { transactionID, reference } = req.body; const tx = await PaymentTransaction.findOne({ where: { reference } }); if (tx) { await tx.update({ status: 'confirmed', external_reference: transactionID, callback_received_at: new Date(), gateway_response: req.body }); await reconcilePayment(tx); } res.json({ success: true }); }
  catch (err) { logger.error('M-Pesa callback error', { error: err.message }); res.json({ success: false }); }
});
router.post('/callback/emola', async (req, res, next) => {
  try { const tx = await PaymentTransaction.findOne({ where: { reference: req.body.reference } }); if (tx) { await tx.update({ status: req.body.status === 'SUCCESS' ? 'confirmed' : 'failed', external_reference: req.body.transaction_id, callback_received_at: new Date(), gateway_response: req.body }); if (req.body.status === 'SUCCESS') await reconcilePayment(tx); } res.json({ success: true }); }
  catch (err) { logger.error('e-Mola callback error', { error: err.message }); res.json({ success: false }); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, method, from, to, loan_id, page = 1, limit = 1000 } = req.query;
    const scope = {};
    if (req.user.role !== 'super_admin' && req.user.role !== 'client') scope.institution_id = req.user.institution_id;
    await applyLateFees(scope);
    const where = {};
    if (status) where.status = status; if (method) where.method = method; if (loan_id) where.loan_id = loan_id;
    if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };
    if (req.user.role !== 'super_admin' && req.user.role !== 'client') where.institution_id = req.user.institution_id;
    if (req.user.role === 'client') { const client = await Client.findOne({ where: { user_id: req.user.id } }); where.client_id = client?.id; }
    const { count, rows } = await PaymentTransaction.findAndCountAll({
      where,
      include: [{ model: Loan, include: [{ model: LoanApplication, include: [{ model: Client, include: [{ model: User, attributes: ['full_name','email','phone'] }] }, CreditProduct] }] }],
      order: [['created_at','DESC']], limit: Math.min(parseInt(limit), 200000), offset: (parseInt(page)-1)*parseInt(limit),
    });
    const registrarIds = [...new Set(rows.map(r => r.registered_by).filter(Boolean))];
    const registrars = registrarIds.length ? await User.findAll({ where: { id: { [Op.in]: registrarIds } }, attributes: ['id','full_name','email','role'], raw: true }) : [];
    const registrarMap = new Map(registrars.map(u => [u.id, u]));
    const data = rows.map(r => ({ ...r.toJSON(), created_at: r.createdAt, registered_by_user: registrarMap.get(r.registered_by) || null }));
    res.json({ success:true, data, meta:{ total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

router.get('/:id/receipt', authenticate, async (req, res, next) => {
  try {
    const tx = await PaymentTransaction.findByPk(req.params.id, { include: [Loan] });
    if (!tx) return res.status(404).json({ success:false, message:'Pagamento não encontrado' });
    if (!await assertLoanAccess(req, tx.Loan)) return res.status(403).json({ success:false, message:'Acesso negado' });
    if (!tx.receipt_file_path || !fs.existsSync(tx.receipt_file_path)) return res.status(404).json({ success:false, message:'Comprovativo não encontrado' });
    res.download(tx.receipt_file_path, tx.receipt_original_name || tx.receipt_file_name);
  } catch (err) { next(err); }
});

router.post('/reconcile', authenticate, authorize('inst_admin','super_admin'), async (req, res, next) => {
  try { const where = { status: 'confirmed', reconciled: false }; if (req.user.role !== 'super_admin') where.institution_id = req.user.institution_id; const pending = await PaymentTransaction.findAll({ where, limit: 200 }); let reconciled = 0; for (const tx of pending) { try { await reconcilePayment(tx, req.user); reconciled++; } catch(e) { logger.error('Reconcile error', { txId: tx.id, error: e.message }); } } res.json({ success:true, message:`${reconciled} pagamentos reconciliados` }); }
  catch (err) { next(err); }
});

// Aloca o valor de UMA transacção contra as prestações ainda por pagar do empréstimo (FIFO
// por data de vencimento). Só actualiza as prestações — quem chama é responsável por
// recalcular os totais do empréstimo a seguir (recomputeLoanTotals), para que o total pago
// nunca fique dependente de esta alocação ter "encaixado" nalguma prestação.
async function allocateTransactionToSchedules(tx) {
  let amountLeft = parseFloat(tx.amount || 0);
  const allSchedules = await PaymentSchedule.findAll({ where: { loan_id: tx.loan_id }, order: [['due_date','ASC']] });
  const payableSchedules = allSchedules.filter(s => ['pending','partial','overdue'].includes(s.status));

  for (const schedule of payableSchedules) {
    if (amountLeft <= 0) break;
    const dueWithLate = parseFloat(schedule.total_due || 0) + parseFloat(schedule.late_fee || 0);
    const remaining = Math.max(dueWithLate - parseFloat(schedule.total_paid || 0), 0);
    const pay = Math.min(amountLeft, remaining);
    if (pay <= 0) continue;
    const newPaid = parseFloat(schedule.total_paid || 0) + pay;
    const isPaid = newPaid >= dueWithLate - PAID_TOLERANCE;
    await schedule.update({
      total_paid: newPaid,
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date() : null,
    });
    amountLeft -= pay;
  }
}

// Recalcula outstanding_balance/total_paid/installments_paid/status do empréstimo a partir do
// estado ACTUAL das prestações e da SOMA real das transacções confirmadas — nunca por
// incremento (previousPaid + tx.amount). Um incremento cego permitia o total pago do
// empréstimo subir mesmo quando a alocação à prestação falhava (ex.: prestações ainda não
// geradas nesse instante), ficando o valor "perdido": contava no total mas não em nenhuma
// prestação, exactamente o sintoma de pagamentos que não se "juntam".
async function recomputeLoanTotals(loanId) {
  const loan = await Loan.findByPk(loanId, { include: [{ model: LoanApplication }] });
  if (!loan) return;
  const schedulesAfter = await PaymentSchedule.findAll({ where: { loan_id: loanId } });
  const scheduleTotal = schedulesAfter.reduce((sum, s) => sum + parseFloat(s.total_due || 0) + parseFloat(s.late_fee || 0), 0);
  const contractTotal = Math.max(
    scheduleTotal,
    parseFloat(loan.LoanApplication?.total_repayable || 0),
    parseFloat(loan.principal || 0),
  );
  const confirmedTotal = parseFloat(await PaymentTransaction.sum('amount', { where: { loan_id: loanId, status: 'confirmed' } }) || 0);
  const newBalance = Math.max(contractTotal - confirmedTotal, 0);
  const paidSchedules = schedulesAfter.filter(s => s.status === 'paid').length;
  const allInstallmentsPaid = schedulesAfter.length > 0 && paidSchedules >= schedulesAfter.length;
  const isLiquidated = newBalance <= 0 && (schedulesAfter.length === 0 || allInstallmentsPaid);

  await loan.update({
    outstanding_balance: newBalance,
    total_paid: confirmedTotal,
    installments_paid: paidSchedules,
    status: isLiquidated ? 'completed' : (loan.status === 'completed' ? 'active' : loan.status),
  });
}

async function reconcilePayment(tx, actor = null, opts = {}) {
  await allocateTransactionToSchedules(tx);
  await recomputeLoanTotals(tx.loan_id);
  await tx.update({ reconciled: true, reconciled_at: new Date() });
  if (!opts.silent) {
    try { const { triggerEvent } = require('../services/notification/notificationService'); await triggerEvent('payment_received', { institutionId: tx.institution_id, clientId: tx.client_id, data: { amount: tx.amount, reference: tx.reference, method: tx.method } }); } catch(e) {}
  }
}

// Reconstrói o estado do empréstimo (prestações + total pago) a partir do zero, substituindo
// todas as transacções ainda confirmadas por ordem cronológica. Usado depois de editar ou
// cancelar um pagamento (e também serve para reparar empréstimos cujo total pago tenha
// ficado dessincronizado das prestações por qualquer motivo histórico).
async function rebuildLoanFromTransactions(loanId) {
  const schedules = await PaymentSchedule.findAll({ where: { loan_id: loanId } });
  for (const s of schedules) {
    await s.update({ total_paid: 0, status: 'pending', late_fee: 0, paid_at: null });
  }
  const loan = await Loan.findByPk(loanId);
  if (!loan) return;
  await loan.update({ status: loan.status === 'completed' ? 'active' : loan.status });

  const activeTxs = await PaymentTransaction.findAll({
    where: { loan_id: loanId, status: 'confirmed' },
    order: [['created_at', 'ASC']],
  });
  for (const tx of activeTxs) {
    await allocateTransactionToSchedules(tx);
    if (!tx.reconciled) await tx.update({ reconciled: true, reconciled_at: new Date() });
  }
  await recomputeLoanTotals(loanId);
  await applyLateFeesForLoan(loanId);
}

router.post('/:id/cancel', authenticate, authorize('inst_admin', 'super_admin'), audit('payment_cancelled'), async (req, res, next) => {
  try {
    const tx = await PaymentTransaction.findByPk(req.params.id, { include: [Loan] });
    if (!tx) return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
    if (!await assertLoanAccess(req, tx.Loan)) return res.status(403).json({ success: false, message: 'Acesso negado' });
    if (tx.status === 'reversed') return res.status(400).json({ success: false, message: 'Este pagamento já está cancelado' });
    if (tx.status !== 'confirmed') return res.status(400).json({ success: false, message: 'Só é possível cancelar pagamentos confirmados' });
    await tx.update({ status: 'reversed', cancelled_at: new Date(), cancelled_by: req.user.id, cancel_reason: req.body?.reason || null });
    await rebuildLoanFromTransactions(tx.loan_id);
    res.json({ success: true, message: 'Pagamento cancelado. Total pago e prestações foram actualizados.', data: tx });
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('inst_admin', 'super_admin'), audit('payment_edited'), async (req, res, next) => {
  try {
    const tx = await PaymentTransaction.findByPk(req.params.id, { include: [Loan] });
    if (!tx) return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
    if (!await assertLoanAccess(req, tx.Loan)) return res.status(403).json({ success: false, message: 'Acesso negado' });
    if (tx.status !== 'confirmed') return res.status(400).json({ success: false, message: 'Só é possível editar pagamentos confirmados' });
    const { amount, method, external_reference, phone_number } = req.body;
    const changes = { edited_at: new Date(), edited_by: req.user.id };
    if (amount != null && Number(amount) > 0 && Number(amount) !== Number(tx.amount)) {
      if (tx.original_amount == null) changes.original_amount = tx.amount;
      changes.amount = amount;
    }
    if (method) changes.method = method;
    if (external_reference !== undefined) changes.external_reference = external_reference;
    if (phone_number !== undefined) changes.phone_number = phone_number;
    await tx.update(changes);
    await rebuildLoanFromTransactions(tx.loan_id);
    res.json({ success: true, message: 'Pagamento actualizado e saldo do empréstimo recalculado.', data: tx });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.applyLateFeesForLoan = applyLateFeesForLoan;
module.exports.rebuildLoanFromTransactions = rebuildLoanFromTransactions;
