const express = require('express');
const router = express.Router();
const { LoanApplication, Loan, PaymentTransaction, Client, Institution } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { fn, col, Op } = require('sequelize');

router.get('/portfolio', authenticate, async (req, res, next) => {
  try {
    const where = req.user.role !== 'super_admin' ? { institution_id: req.user.institution_id } : {};
    const data = await Loan.findAll({
      where, attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('outstanding_balance')), 'total_balance'], [fn('SUM', col('principal')), 'total_principal']],
      group: ['status'], raw: true,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/payments-summary', authenticate, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = { status: 'confirmed' };
    if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };
    if (req.user.role !== 'super_admin') where.institution_id = req.user.institution_id;

    const data = await PaymentTransaction.findAll({
      where, attributes: ['method', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount')), 'total']],
      group: ['method'], raw: true,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/npl', authenticate, async (req, res, next) => {
  try {
    const where = req.user.role !== 'super_admin' ? { institution_id: req.user.institution_id } : {};
    const [total, overdue] = await Promise.all([
      Loan.sum('principal', { where }),
      Loan.sum('outstanding_balance', { where: { ...where, status: 'overdue' } }),
    ]);
    res.json({ success: true, data: { total_portfolio: total || 0, overdue_balance: overdue || 0, npl_rate: total ? ((overdue || 0) / total * 100).toFixed(2) : '0.00' } });
  } catch (err) { next(err); }
});

module.exports = router;
