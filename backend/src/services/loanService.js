// src/services/loanService.js
const { LoanApplication, Loan, PaymentSchedule, CreditProduct, Client, User, NotificationLog } = require('../models');
const { triggerEvent } = require('./notification/notificationService');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

/**
 * Calculate monthly installment (reducing balance / flat)
 * @param {number} principal
 * @param {number} monthlyRate  e.g. 0.032 for 3.2%
 * @param {number} termMonths
 * @param {'reducing_balance'|'flat'} type
 * @returns {{ installment, totalInterest, totalRepayable, schedule }}
 */
function calculateLoan({ principal, monthlyRate, termMonths, type = 'reducing_balance' }) {
  if (type === 'reducing_balance') {
    // PMT formula
    const r = monthlyRate;
    const n = termMonths;
    const pmt = r === 0
      ? principal / n
      : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    let balance = principal;
    const schedule = [];

    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      const principalPmt = pmt - interest;
      balance -= principalPmt;

      schedule.push({
        installment_number: i,
        principal_due: round(principalPmt),
        interest_due: round(interest),
        total_due: round(pmt),
        balance_after: round(Math.max(balance, 0)),
      });
    }

    const totalRepayable = round(pmt * n);
    const totalInterest = round(totalRepayable - principal);

    return {
      monthly_installment: round(pmt),
      total_interest: totalInterest,
      total_repayable: totalRepayable,
      schedule,
    };
  }

  // Flat rate
  const monthlyInterest = principal * monthlyRate;
  const principalPerMonth = principal / termMonths;
  const installment = principalPerMonth + monthlyInterest;
  const totalInterest = monthlyInterest * termMonths;

  const schedule = Array.from({ length: termMonths }, (_, i) => ({
    installment_number: i + 1,
    principal_due: round(principalPerMonth),
    interest_due: round(monthlyInterest),
    total_due: round(installment),
    balance_after: round(principal - principalPerMonth * (i + 1)),
  }));

  return {
    monthly_installment: round(installment),
    total_interest: round(totalInterest),
    total_repayable: round(principal + totalInterest),
    schedule,
  };
}

/**
 * Generate payment schedule entries for a disbursed loan
 */
async function generateSchedule(loan, disbursedAt) {
  const product = await CreditProduct.findByPk(
    (await LoanApplication.findByPk(loan.application_id)).product_id
  );

  const calc = calculateLoan({
    principal: parseFloat(loan.principal),
    monthlyRate: parseFloat(loan.interest_rate),
    termMonths: loan.term_months,
    type: product.interest_type,
  });

  const startDate = new Date(disbursedAt);
  const scheduleRows = calc.schedule.map((row, idx) => {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + idx + 1);
    return {
      id: uuidv4(),
      loan_id: loan.id,
      installment_number: row.installment_number,
      due_date: due.toISOString().split('T')[0],
      principal_due: row.principal_due,
      interest_due: row.interest_due,
      total_due: row.total_due,
      status: 'pending',
    };
  });

  await PaymentSchedule.bulkCreate(scheduleRows);
  return scheduleRows;
}

/**
 * Update loan status and trigger notifications
 */
async function updateApplicationStatus(applicationId, newStatus, reviewedBy, reason = null, context = {}) {
  const app = await LoanApplication.findByPk(applicationId, {
    include: [{ model: Client, include: [User] }, 'Institution', 'CreditProduct']
  });
  if (!app) throw new Error('Application not found');

  const oldStatus = app.status;
  await app.update({
    status: newStatus,
    reviewed_by: reviewedBy,
    reviewed_at: new Date(),
    rejection_reason: reason,
    ...(newStatus === 'approved' && context.approvedAmount && {
      approved_amount: context.approvedAmount,
      interest_rate: context.interestRate || app.interest_rate,
    }),
  });

  // Map status to notification event
  const eventMap = {
    submitted: 'loan_submitted',
    under_review: 'loan_under_review',
    docs_requested: 'loan_docs_requested',
    approved: 'loan_approved',
    rejected: 'loan_rejected',
    disbursed: 'loan_disbursed',
  };

  const event = eventMap[newStatus];
  if (event) {
    await triggerEvent(event, {
      institutionId: app.institution_id,
      clientId: app.client_id,
      recipientEmail: app.Client?.User?.email,
      recipientPhone: app.Client?.User?.phone,
      data: {
        clientName: app.Client?.User?.full_name,
        amount: app.approved_amount || app.requested_amount,
        reference: app.reference,
        institutionName: app.Institution?.name,
        product: app.CreditProduct?.name,
        reason,
        installment: app.monthly_installment,
        term: app.term_months,
      },
    });
  }

  const statusLabels = { submitted: 'Submetido', under_review: 'Em análise', approved: 'Aprovado', rejected: 'Desaprovado', disbursed: 'Desembolsado', docs_requested: 'Documentos solicitados' };
  await notifyAdminsOfApplication(app, event || 'loan_status_changed', {
    statusLabel: statusLabels[newStatus] || newStatus,
    clientName: app.Client?.User?.full_name,
    amount: app.approved_amount || app.requested_amount,
  });
  return app;
}


async function notifyAdminsOfApplication(app, event, data) {
  const admins = await User.findAll({
    where: {
      role: { [Op.in]: ['super_admin', 'inst_admin'] },
      status: 'active',
      ...(app.institution_id ? { } : {}),
    },
  });
  const eligible = admins.filter(u => u.role === 'super_admin' || u.institution_id === app.institution_id);
  const emailProvider = require('./notification/providers/emailProvider');
  for (const admin of eligible) {
    const subject = `Pedido ${app.reference}: ${data.statusLabel}`;
    const body = `<p>Existe actualização no pedido <strong>${app.reference}</strong>.</p><p>Cliente: <strong>${data.clientName || 'Cliente'}</strong><br>Valor: <strong>${data.amount}</strong><br>Estado: <strong>${data.statusLabel}</strong></p>`;
    const log = await NotificationLog.create({
      institution_id: admin.institution_id || app.institution_id,
      recipient_id: admin.id,
      recipient_email: admin.email,
      recipient_phone: admin.phone,
      channel: 'email',
      event,
      subject,
      body,
      status: 'queued',
      attempts: 0,
      max_attempts: 3,
      metadata: { applicationId: app.id, reference: app.reference, target: 'admin_or_superadmin' },
    });
    try {
      await log.update({ status: 'sending', attempts: 1 });
      const result = await emailProvider.send({ to: admin.email, subject, body, institutionId: admin.institution_id || app.institution_id });
      await log.update({ status: 'sent', provider: result.provider, provider_message_id: result.messageId, sent_at: new Date(), error_message: null });
    } catch (err) {
      await log.update({ status: 'failed', error_message: err.message });
    }
  }
}

function round(val) {
  return Math.round(val * 100) / 100;
}

module.exports = { calculateLoan, generateSchedule, updateApplicationStatus };
