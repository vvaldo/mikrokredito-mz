// src/routes/loans.js
const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { LoanApplication, Loan, PaymentSchedule, CreditProduct, Client, User, Document, NotificationLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { calculateLoan, generateSchedule, updateApplicationStatus } = require('../services/loanService');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const emailProvider = require('../services/notification/providers/emailProvider');

const REQUIRED_LOAN_DOCS = ['bi', 'nuit', 'residence_certificate', 'bank_statement'];

async function enrichApplicationsWithProfileDocuments(applications) {
  const list = Array.isArray(applications) ? applications : [applications];
  const jsonList = list.map(app => typeof app.toJSON === 'function' ? app.toJSON() : app).filter(Boolean);
  const clientIds = [...new Set(jsonList.map(app => app.client_id).filter(Boolean))];
  if (!clientIds.length) return Array.isArray(applications) ? jsonList : jsonList[0];

  const profileDocs = await Document.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      type: { [Op.in]: REQUIRED_LOAN_DOCS },
      status: { [Op.in]: ['pending', 'approved'] },
    },
    order: [['created_at', 'DESC']],
  });

  const docsByClient = new Map();
  for (const d of profileDocs.map(d => d.toJSON())) {
    if (!docsByClient.has(d.client_id)) docsByClient.set(d.client_id, []);
    docsByClient.get(d.client_id).push(d);
  }

  const enriched = jsonList.map(app => {
    const existingDocs = Array.isArray(app.Documents) ? app.Documents : [];
    const merged = [...existingDocs];
    const seen = new Set(existingDocs.map(d => d.id));
    for (const d of docsByClient.get(app.client_id) || []) {
      if (!seen.has(d.id)) {
        merged.push({ ...d, inherited_from_client_profile: !d.loan_id });
        seen.add(d.id);
      }
    }
    const docTypes = new Set(merged.map(d => d.type));
    return {
      ...app,
      Documents: merged,
      document_summary: {
        required: REQUIRED_LOAN_DOCS.length,
        submitted: REQUIRED_LOAN_DOCS.filter(t => docTypes.has(t)).length,
        missing: REQUIRED_LOAN_DOCS.filter(t => !docTypes.has(t)),
      },
    };
  });
  return Array.isArray(applications) ? enriched : enriched[0];
}

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function computeLoanFinancialSummary(loanJson) {
  const schedules = Array.isArray(loanJson.PaymentSchedules) ? loanJson.PaymentSchedules : [];
  const scheduleTotal = schedules.reduce((sum, s) => sum + Number(s.total_due || 0) + Number(s.late_fee || 0), 0);
  const principal = Number(loanJson.principal || loanJson.LoanApplication?.approved_amount || loanJson.LoanApplication?.requested_amount || 0);
  const totalRepayable = Math.max(
    Number(loanJson.LoanApplication?.total_repayable || 0),
    scheduleTotal,
    Number(loanJson.outstanding_balance || 0),
    principal,
  );
  const totalPaid = Number(loanJson.total_paid || 0);
  const balance = Math.max(totalRepayable - totalPaid, Number(loanJson.outstanding_balance || 0), 0);
  const interest = Math.max(totalRepayable - principal, 0);
  const lateFees = schedules.reduce((sum, s) => sum + Number(s.late_fee || 0), 0);
  const paidSchedules = schedules.filter(s => s.status === 'paid').length;
  const allInstallmentsPaid = schedules.length > 0 && paidSchedules >= schedules.length;
  const trulyCompleted = balance <= 0.01 && (schedules.length === 0 || allInstallmentsPaid);
  const computedStatus = trulyCompleted ? 'completed' : (loanJson.status === 'completed' ? 'active' : loanJson.status);
  return {
    principal: roundMoney(principal),
    total_interest: roundMoney(interest),
    total_repayable: roundMoney(totalRepayable),
    total_paid: roundMoney(totalPaid),
    outstanding_balance: roundMoney(balance),
    late_fee_accumulated: roundMoney(lateFees),
    term_months: Number(loanJson.term_months || loanJson.LoanApplication?.term_months || 0),
    computed_status: computedStatus,
    is_liquidated: trulyCompleted,
  };
}

async function normalizeLoanStatusIfNeeded(loan, summary) {
  if (!loan || !summary) return;
  const updates = {};
  const currentBalance = Number(loan.outstanding_balance || 0);
  if (Math.abs(currentBalance - summary.outstanding_balance) > 0.01) updates.outstanding_balance = summary.outstanding_balance;
  if (loan.status === 'completed' && !summary.is_liquidated) updates.status = summary.computed_status || 'active';
  if (summary.is_liquidated && loan.status !== 'completed') updates.status = 'completed';
  if (Object.keys(updates).length) await loan.update(updates);
}

// ── Simulate loan (public / client)
router.post('/simulate',
  [
    body('principal').isFloat({ min: 100 }),
    body('monthly_rate').isFloat({ min: 0.001, max: 0.5 }),
    body('term_months').isInt({ min: 1, max: 120 }),
    body('type').optional().isIn(['reducing_balance', 'flat']),
  ],
  validate,
  (req, res) => {
    const { principal, monthly_rate, term_months, type } = req.body;
    const result = calculateLoan({ principal, monthlyRate: monthly_rate, termMonths: term_months, type });
    res.json({ success: true, data: result });
  }
);

// ── List applications
router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const { status, institution_id, client_id, from, to, page = 1, limit = 20 } = req.query;

      const where = {};
      if (status) where.status = status;
      if (institution_id) where.institution_id = institution_id;
      if (client_id) where.client_id = client_id;
      if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };

      // Scope by role
      if (req.user.role === 'client') {
        const client = await Client.findOne({ where: { user_id: req.user.id } });
        where.client_id = client?.id;
      } else if (['inst_admin', 'inst_agent'].includes(req.user.role)) {
        where.institution_id = req.user.institution_id;
      }

      const { count, rows } = await LoanApplication.findAndCountAll({
        where,
        include: [
          { model: Client, include: [{ model: User, attributes: ['full_name', 'email', 'phone'] }] },
          { model: CreditProduct, attributes: ['name'] },
          { model: Document },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });

      const enrichedRows = await enrichApplicationsWithProfileDocuments(rows);
      res.json({ success: true, data: enrichedRows, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) { next(err); }
  }
);


// ── Client recent requests + active/completed loans with schedules and documents
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const client = await Client.findOne({ where: { user_id: req.user.id } });
    if (!client) return res.status(404).json({ success: false, message: 'Perfil de cliente não encontrado' });
    const apps = await LoanApplication.findAll({
      where: { client_id: client.id },
      include: [
        { model: CreditProduct },
        { model: Document },
        { model: Loan, include: [PaymentSchedule] },
        { model: Document },
      ],
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    const enrichedApps = await enrichApplicationsWithProfileDocuments(apps);
    res.json({ success: true, data: enrichedApps });
  } catch (err) { next(err); }
});

// ── Active/disbursed loans list for institution/super/client
router.get('/active/list', authenticate, async (req, res, next) => {
  try {
    const where = { status: { [Op.in]: ['active','overdue','completed'] } };
    const appWhere = { status: { [Op.in]: ['approved', 'disbursed'] } };
    if (req.user.role === 'client') {
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      where.client_id = client?.id;
      appWhere.client_id = client?.id;
    } else if (req.user.role !== 'super_admin') {
      where.institution_id = req.user.institution_id;
      appWhere.institution_id = req.user.institution_id;
    }

    const loans = await Loan.findAll({
      where,
      include: [
        { model: LoanApplication, include: [{ model: CreditProduct }, { model: Document }, { model: Client, include: [{ model: User, attributes: ['full_name','email','phone'] }] }] },
        { model: PaymentSchedule, order: [['installment_number','ASC']] },
      ],
      order: [['created_at','DESC']],
      limit: parseInt(req.query.limit || 500),
    });

    const loanAppIds = new Set(loans.map(l => l.application_id).filter(Boolean));
    const approvedWithoutLoan = await LoanApplication.findAll({
      where: { ...appWhere, id: { [Op.notIn]: Array.from(loanAppIds).length ? Array.from(loanAppIds) : ['00000000-0000-0000-0000-000000000000'] } },
      include: [
        { model: CreditProduct },
        { model: Document },
        { model: Client, include: [{ model: User, attributes: ['full_name','email','phone'] }] },
      ],
      order: [['updated_at','DESC']],
      limit: parseInt(req.query.limit || 500),
    });

    const normalizedLoans = [];
    for (const loan of loans) {
      const json = loan.toJSON();
      if (json.LoanApplication) {
        json.LoanApplication = await enrichApplicationsWithProfileDocuments(json.LoanApplication);
      }
      const summary = computeLoanFinancialSummary(json);
      await normalizeLoanStatusIfNeeded(loan, summary);
      json.status = summary.computed_status;
      json.outstanding_balance = summary.outstanding_balance;
      json.total_paid = summary.total_paid;
      json.financial_summary = summary;
      normalizedLoans.push(json);
    }

    const enrichedApprovedWithoutLoan = await enrichApplicationsWithProfileDocuments(approvedWithoutLoan);
    const pendingDisbursement = enrichedApprovedWithoutLoan.map(app => ({
      id: `application-${app.id}`,
      application_id: app.id,
      client_id: app.client_id,
      institution_id: app.institution_id,
      principal: app.approved_amount || app.requested_amount,
      outstanding_balance: app.approved_amount || app.requested_amount,
      interest_rate: app.interest_rate,
      term_months: app.term_months,
      status: app.status === 'approved' ? 'approved_pending_disbursement' : 'disbursed_without_schedule',
      disbursed_at: app.disbursed_at || null,
      LoanApplication: app,
      PaymentSchedules: [],
      is_application_only: true,
    }));

    res.json({ success: true, data: [...normalizedLoans, ...pendingDisbursement] });
  } catch (err) { next(err); }
});

// ── Get single application
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const app = await LoanApplication.findByPk(req.params.id, {
      include: [
        { model: Client, include: [{ model: User, attributes: ['full_name', 'email', 'phone'] }] },
        { model: CreditProduct },
        { model: Loan, include: [PaymentSchedule] },
        { model: Document },
      ]
    });
    if (!app) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    const enrichedApp = await enrichApplicationsWithProfileDocuments(app);
    res.json({ success: true, data: enrichedApp });
  } catch (err) { next(err); }
});

// ── Submit new application
router.post('/',
  authenticate,
  [
    body('product_id').isUUID(),
    body('requested_amount').isFloat({ min: 100 }),
    body('term_months').isInt({ min: 1 }),
    body('purpose').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { product_id, requested_amount, term_months, purpose, purpose_detail, client_id } = req.body;

      const product = await CreditProduct.findByPk(product_id);
      if (!product || product.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Produto não disponível' });
      }

      if (requested_amount < product.min_amount || requested_amount > product.max_amount) {
        return res.status(400).json({ success: false, message: `Valor fora do intervalo: ${product.min_amount}–${product.max_amount} MZN` });
      }

      if (parseInt(term_months, 10) < product.min_term_months || parseInt(term_months, 10) > product.max_term_months) {
        return res.status(400).json({ success: false, message: `Prazo fora do intervalo permitido para este produto: ${product.min_term_months}–${product.max_term_months} meses` });
      }

      let client;
      if (req.user.role === 'client') client = await Client.findOne({ where: { user_id: req.user.id } });
      else if (client_id) client = await Client.findByPk(client_id);
      if (!client) return res.status(400).json({ success: false, message: 'Perfil de cliente não encontrado ou cliente não informado' });

      const requiredDocs = REQUIRED_LOAN_DOCS;
      const approvedDocs = await Document.findAll({
        where: { client_id: client.id, type: { [Op.in]: requiredDocs }, status: { [Op.in]: ['pending', 'approved'] } },
        attributes: ['type'], raw: true,
      });
      const present = new Set(approvedDocs.map(d => d.type));
      const missing = requiredDocs.filter(t => !present.has(t));
      if (missing.length) {
        const labels = { bi: 'BI', nuit: 'NUIT', residence_certificate: 'Atestado de residência', bank_statement: 'Extracto bancário dos últimos 3 meses' };
        return res.status(400).json({
          success: false,
          message: `Pedido bloqueado. Documentos obrigatórios em falta: ${missing.map(t => labels[t]).join(', ')}.`,
          missing_documents: missing,
        });
      }

      if (parseFloat(requested_amount) > 50000 && parseFloat(requested_amount) <= 100000 && !req.body.notary_document_confirmed) {
        return res.status(400).json({
          success: false,
          message: 'Pedidos entre 51.000 e 100.000 MZN exigem confirmação de formalização documental em cartório/escritório.',
        });
      }

      const openStatuses = ['draft', 'submitted', 'under_review', 'docs_requested', 'approved'];
      const existingOpen = await LoanApplication.findOne({
        where: { client_id: client.id, product_id, status: { [Op.in]: openStatuses } },
        order: [['created_at', 'DESC']],
      });
      if (existingOpen) {
        return res.status(409).json({
          success: false,
          message: `Já existe um pedido aberto para este produto (${existingOpen.reference}). Feche ou aguarde decisão antes de submeter outro.`,
          data: existingOpen,
        });
      }

      const calc = calculateLoan({
        principal: requested_amount,
        monthlyRate: parseFloat(product.interest_rate),
        termMonths: term_months,
        type: product.interest_type,
      });

      const application = await LoanApplication.create({
        id: uuidv4(),
        reference: `EMP-${Date.now().toString().slice(-6)}`,
        client_id: client.id,
        institution_id: product.institution_id,
        product_id,
        requested_amount,
        term_months,
        purpose,
        purpose_detail,
        interest_rate: product.interest_rate,
        processing_fee: Math.round(requested_amount * parseFloat(product.processing_fee_rate) * 100) / 100,
        monthly_installment: calc.monthly_installment,
        total_repayable: calc.total_repayable,
        status: 'submitted',
      });

      // Não mover documentos KYC do perfil para o pedido.
      // A listagem do pedido herda documentos do perfil do cliente para evitar 0/4 quando o cliente já submeteu KYC.

      await updateApplicationStatus(application.id, 'submitted', req.user.id);
      try {
        const { triggerEvent } = require('../services/notification/notificationService');
        await triggerEvent('loan_submitted', { institutionId: product.institution_id, recipientEmail: req.user.email, recipientPhone: req.user.phone, data: { reference: application.reference, amount: requested_amount } });
      } catch(e) {}

      res.status(201).json({ success: true, data: application, calculation: calc });
    } catch (err) { next(err); }
  }
);

// ── Update application (admin)
router.patch('/:id',
  authenticate,
  authorize('inst_admin', 'inst_agent', 'super_admin'),
  async (req, res, next) => {
    try {
      const app = await LoanApplication.findByPk(req.params.id);
      if (!app) return res.status(404).json({ success: false, message: 'Pedido não encontrado' });

      const { status, approved_amount, interest_rate, rejection_reason, notes } = req.body;

      const allowedTransitions = {
        submitted: ['under_review', 'rejected', 'docs_requested'],
        under_review: ['approved', 'rejected', 'docs_requested'],
        docs_requested: ['under_review', 'rejected'],
        approved: ['rejected'],
        rejected: [],
        disbursed: [],
      };
      if (status && status !== app.status) {
        const allowed = allowedTransitions[app.status] || [];
        if (!allowed.includes(status)) {
          return res.status(400).json({ success: false, message: `Transição inválida: ${app.status} → ${status}. Fluxo permitido: submetido → análise → aprovado/desaprovado → desembolsado.` });
        }
      }

      // Recalculate if amounts or rate changed
      let updatedCalc = null;
      if (approved_amount || interest_rate) {
        const principal = approved_amount || parseFloat(app.approved_amount) || parseFloat(app.requested_amount);
        const rate = interest_rate ? parseFloat(interest_rate) / 100 : parseFloat(app.interest_rate);
        updatedCalc = calculateLoan({ principal, monthlyRate: rate, termMonths: app.term_months });
      }

      if (status === 'approved') {
        const requiredDocs = REQUIRED_LOAN_DOCS;
        const docs = await Document.findAll({ where: { client_id: app.client_id, type: { [Op.in]: requiredDocs }, status: { [Op.in]: ['pending', 'approved'] } } });
        const present = new Set(docs.map(d => d.type));
        const missing = requiredDocs.filter(t => !present.has(t));
        if (missing.length) return res.status(400).json({ success: false, message: `Não é possível aprovar. Documentos em falta: ${missing.join(', ')}`, missing_documents: missing });
      }

      if (status) {
        await updateApplicationStatus(app.id, status, req.user.id, rejection_reason, {
          approvedAmount: approved_amount,
          interestRate: interest_rate ? parseFloat(interest_rate) / 100 : undefined,
        });
      } else {
        await app.update({
          approved_amount, interest_rate: interest_rate ? parseFloat(interest_rate) / 100 : undefined,
          notes,
          ...(updatedCalc && {
            monthly_installment: updatedCalc.monthly_installment,
            total_repayable: updatedCalc.total_repayable,
          }),
        });
      }

      await app.reload();
      res.json({ success: true, data: app, recalculation: updatedCalc });
    } catch (err) { next(err); }
  }
);

// ── Disburse loan (creates Loan + schedule)
router.post('/:id/disburse',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  audit('loan_disbursed'),
  async (req, res, next) => {
    try {
      const app = await LoanApplication.findByPk(req.params.id);
      if (!app || app.status !== 'approved') {
        return res.status(400).json({ success: false, message: 'Apenas pedidos aprovados podem ser desembolsados' });
      }

      // Permite indicar uma data de desembolso anterior a hoje (ex.: desembolsos feitos
      // antes do lançamento do sistema e agora registados retroactivamente).
      const disbursedAt = req.body.disbursed_at ? new Date(req.body.disbursed_at) : new Date();
      if (isNaN(disbursedAt.getTime())) {
        return res.status(400).json({ success: false, message: 'Data de desembolso inválida' });
      }

      const principal = parseFloat(app.approved_amount || app.requested_amount);
      const calc = calculateLoan({ principal, monthlyRate: parseFloat(app.interest_rate), termMonths: app.term_months });
      const totalRepayable = parseFloat(app.total_repayable || calc.total_repayable || principal);
      const loan = await Loan.create({
        id: uuidv4(),
        application_id: app.id,
        client_id: app.client_id,
        institution_id: app.institution_id,
        principal,
        outstanding_balance: totalRepayable,
        interest_rate: app.interest_rate,
        term_months: app.term_months,
        installments_total: app.term_months,
        disbursed_at: disbursedAt,
        next_due_date: new Date(disbursedAt.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        maturity_date: new Date(disbursedAt.getTime() + app.term_months * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      });

      await app.update({ status: 'disbursed', disbursed_at: disbursedAt });
      const schedule = await generateSchedule(loan, loan.disbursed_at);
      await updateApplicationStatus(app.id, 'disbursed', req.user.id);

      res.json({ success: true, data: { loan, schedule } });
    } catch (err) { next(err); }
  }
);

// ── Corrigir a data de desembolso de um empréstimo já criado e recalcular a tabela de
// prestações a partir dessa data (ex.: desembolsos reais feitos antes do lançamento do
// sistema, agora registados com a data errada). Só permitido se ainda não houver
// prestações pagas/parciais, para não corromper histórico de pagamentos já reflectido.
router.patch('/:id/disbursement',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  audit('loan_disbursement_updated'),
  async (req, res, next) => {
    try {
      const loan = await Loan.findByPk(req.params.id);
      if (!loan) return res.status(404).json({ success: false, message: 'Empréstimo não encontrado' });
      if (req.user.role === 'inst_admin' && req.user.institution_id !== loan.institution_id) {
        return res.status(403).json({ success: false, message: 'Sem permissão para este empréstimo' });
      }

      const disbursedAt = new Date(req.body.disbursed_at);
      if (isNaN(disbursedAt.getTime())) {
        return res.status(400).json({ success: false, message: 'Data de desembolso inválida' });
      }

      const existingSchedules = await PaymentSchedule.findAll({ where: { loan_id: loan.id } });
      if (existingSchedules.some(s => ['paid', 'partial'].includes(s.status))) {
        return res.status(400).json({ success: false, message: 'Já existem prestações pagas para este empréstimo — não é possível alterar a data de desembolso.' });
      }

      await PaymentSchedule.destroy({ where: { loan_id: loan.id } });
      await loan.update({
        disbursed_at: disbursedAt,
        next_due_date: new Date(disbursedAt.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        maturity_date: new Date(disbursedAt.getTime() + loan.term_months * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        days_overdue: 0,
        status: 'active',
      });
      const schedule = await generateSchedule(loan, disbursedAt);

      // Se, com a nova data, alguma prestação já estiver vencida, recalcula os juros de mora imediatamente.
      const { applyLateFeesForLoan } = require('./payments');
      const lateFeeTotal = await applyLateFeesForLoan(loan.id);

      await loan.reload({ include: [{ model: PaymentSchedule }] });
      res.json({ success: true, message: 'Data de desembolso actualizada e prestações recalculadas.', data: { loan, schedule, lateFeeTotal } });
    } catch (err) { next(err); }
  }
);

// ── Direct payment reminder notification for a loan
router.post('/:id/notify-payment',
  authenticate,
  authorize('inst_admin', 'inst_agent', 'super_admin'),
  audit('loan_payment_notification_sent'),
  async (req, res, next) => {
    try {
      const loan = await Loan.findByPk(req.params.id, {
        include: [
          { model: LoanApplication, include: [
            { model: Client, include: [{ model: User, attributes: ['id', 'full_name', 'email', 'phone'] }] },
            CreditProduct,
          ] },
          PaymentSchedule,
        ],
      });
      if (!loan) return res.status(404).json({ success: false, message: 'Empréstimo não encontrado' });
      if (req.user.role !== 'super_admin' && loan.institution_id !== req.user.institution_id) {
        return res.status(403).json({ success: false, message: 'Acesso negado ao empréstimo' });
      }

      const json = loan.toJSON();
      const summary = computeLoanFinancialSummary(json);
      await normalizeLoanStatusIfNeeded(loan, summary);
      const clientUser = json.LoanApplication?.Client?.User;
      if (!clientUser?.email) return res.status(400).json({ success: false, message: 'Cliente sem email registado' });

      const reference = json.LoanApplication?.reference || loan.id;
      const subject = `Aviso de pagamento - ${reference}`;
      const body = `
        <p>Prezado(a) <strong>${clientUser.full_name || 'Cliente'}</strong>,</p>
        <p>Segue o estado actualizado do seu empréstimo <strong>${reference}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          <tr><td style="padding:6px;border:1px solid #ddd">Valor desembolsado</td><td style="padding:6px;border:1px solid #ddd"><strong>${summary.principal.toLocaleString('pt-MZ')} MZN</strong></td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd">Juros totais</td><td style="padding:6px;border:1px solid #ddd"><strong>${summary.total_interest.toLocaleString('pt-MZ')} MZN</strong></td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd">Total a pagar</td><td style="padding:6px;border:1px solid #ddd"><strong>${summary.total_repayable.toLocaleString('pt-MZ')} MZN</strong></td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd">Total pago</td><td style="padding:6px;border:1px solid #ddd"><strong>${summary.total_paid.toLocaleString('pt-MZ')} MZN</strong></td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd">Saldo em dívida</td><td style="padding:6px;border:1px solid #ddd"><strong>${summary.outstanding_balance.toLocaleString('pt-MZ')} MZN</strong></td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd">Juros de mora acumulado</td><td style="padding:6px;border:1px solid #ddd"><strong>${summary.late_fee_accumulated.toLocaleString('pt-MZ')} MZN</strong></td></tr>
        </table>
        <p>Solicitamos que regularize os pagamentos dentro do prazo acordado.</p>
      `;
      const log = await NotificationLog.create({
        institution_id: loan.institution_id,
        recipient_id: clientUser.id,
        recipient_email: clientUser.email,
        recipient_phone: clientUser.phone,
        channel: 'email',
        event: 'payment_due_reminder',
        subject,
        body,
        status: 'sending',
        attempts: 1,
        max_attempts: 3,
        metadata: { loan_id: loan.id, reference, summary },
      });
      try {
        const result = await emailProvider.send({ to: clientUser.email, subject, body, institutionId: loan.institution_id });
        await log.update({ status: 'sent', provider: result.provider, provider_message_id: result.messageId, sent_at: new Date(), error_message: null });
        return res.json({ success: true, message: 'Email enviado ao cliente e registado em logs.', data: log });
      } catch (err) {
        await log.update({ status: 'failed', error_message: err.message });
        return res.status(500).json({ success: false, message: `Falha ao enviar email: ${err.message}`, data: log });
      }
    } catch (err) { next(err); }
  }
);

// ── Get payment schedule
router.get('/:id/schedule', authenticate, async (req, res, next) => {
  try {
    const app = await LoanApplication.findByPk(req.params.id, {
      include: [{ model: Loan, include: [PaymentSchedule] }]
    });
    if (!app) return res.status(404).json({ success: false, message: 'Não encontrado' });
    res.json({ success: true, data: app.Loan?.PaymentSchedules || [] });
  } catch (err) { next(err); }
});



module.exports = router;
