const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { User, Client, LoanApplication, Loan, PaymentTransaction, NotificationLog, Document, CreditProduct, PaymentSchedule } = require('../models');

function scopeInstitution(req) {
  return req.user.role === 'super_admin' ? {} : { institution_id: req.user.institution_id };
}

router.get('/institution', authenticate, async (req, res, next) => {
  try {
    const instWhere = scopeInstitution(req);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-7);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const yearStart = new Date(new Date().getFullYear(),0,1);

    const [clients, kycApproved, kycBlocked, activeLoans, portfolio, failedNotifications, recentApplications, recentNotifications, todayPayments, weekPayments, monthPayments, yearPayments] = await Promise.all([
      Client.count({ include: [{ model: LoanApplication, where: instWhere, required: req.user.role !== 'super_admin' }], distinct: true }),
      Client.count({ where: { kyc_status: 'approved' }, include: [{ model: LoanApplication, where: instWhere, required: req.user.role !== 'super_admin' }], distinct: true }),
      Client.count({ where: { kyc_status: { [Op.in]: ['incomplete','rejected'] } }, include: [{ model: LoanApplication, where: instWhere, required: req.user.role !== 'super_admin' }], distinct: true }),
      Loan.count({ where: { ...instWhere, status: { [Op.in]: ['active','overdue'] } } }),
      Loan.sum('outstanding_balance', { where: { ...instWhere, status: { [Op.in]: ['active','overdue'] } } }),
      NotificationLog.count({ where: { ...instWhere, status: 'failed' } }),
      LoanApplication.findAll({
        where: instWhere,
        include: [{ model: Client, include: [{ model: User, attributes: ['full_name','email','phone'] }] }, { model: Document }],
        order: [['created_at','DESC']], limit: 8,
      }),
      NotificationLog.findAll({ where: instWhere, order: [['created_at','DESC']], limit: 8 }),
      PaymentTransaction.sum('amount', { where: { ...instWhere, status: 'confirmed', created_at: { [Op.gte]: todayStart } } }),
      PaymentTransaction.sum('amount', { where: { ...instWhere, status: 'confirmed', created_at: { [Op.gte]: weekStart } } }),
      PaymentTransaction.sum('amount', { where: { ...instWhere, status: 'confirmed', created_at: { [Op.gte]: monthStart } } }),
      PaymentTransaction.sum('amount', { where: { ...instWhere, status: 'confirmed', created_at: { [Op.gte]: yearStart } } }),
    ]);

    res.json({ success: true, data: {
      clients: Number(clients || 0),
      kyc_complete: Number(kycApproved || 0),
      kyc_blocked: Number(kycBlocked || 0),
      active_loans: Number(activeLoans || 0),
      portfolio_total: Number(portfolio || 0),
      failed_notifications: Number(failedNotifications || 0),
      payments: {
        today: Number(todayPayments || 0), week: Number(weekPayments || 0), month: Number(monthPayments || 0), year: Number(yearPayments || 0)
      },
      recent_applications: recentApplications,
      recent_notifications: recentNotifications,
      refreshed_at: new Date().toISOString(),
    }});
  } catch (err) { next(err); }
});



router.get('/client', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'client') return res.status(403).json({ success:false, message:'Acesso reservado ao cliente' });
    const client = await Client.findOne({ where: { user_id: req.user.id }, include: [{ model: User, attributes:['full_name','email','phone'] }] });
    if (!client) return res.status(404).json({ success:false, message:'Perfil de cliente não encontrado' });

    const applications = await LoanApplication.findAll({
      where: { client_id: client.id },
      include: [
        { model: CreditProduct, attributes:['name','description'] },
        { model: Document },
        { model: Loan, include: [PaymentSchedule] },
      ],
      order: [['created_at','DESC']],
      limit: 50,
    });

    const unreadNotifications = await NotificationLog.count({ where: { recipient_id: { [Op.in]: [req.user.id, client.id] }, read_at: { [Op.is]: null } } });
    const notifications = await NotificationLog.findAll({
      where: { recipient_id: { [Op.in]: [req.user.id, client.id] } },
      order: [['created_at','DESC']],
      limit: 10,
    });

    const pendingStatuses = ['submitted','under_review','docs_requested','approved'];
    const finalStatuses = ['rejected','disbursed','cancelled'];
    let nextDue = null;
    for (const app of applications) {
      const schedules = app.Loan?.PaymentSchedules || [];
      const due = schedules.filter(p => ['pending','partial','overdue'].includes(p.status)).sort((a,b) => new Date(a.due_date)-new Date(b.due_date))[0];
      if (due && (!nextDue || new Date(due.due_date) < new Date(nextDue.due_date))) nextDue = due;
    }

    res.json({ success:true, data: {
      client,
      pending_count: applications.filter(a => pendingStatuses.includes(a.status)).length,
      finished_count: applications.filter(a => finalStatuses.includes(a.status)).length,
      unread_notifications: unreadNotifications,
      next_due: nextDue,
      applications,
      notifications,
      refreshed_at: new Date().toISOString(),
    }});
  } catch (err) { next(err); }
});

module.exports = router;
