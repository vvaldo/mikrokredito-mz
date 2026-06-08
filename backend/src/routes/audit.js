const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

router.get('/', authenticate, authorize('super_admin', 'inst_admin'), async (req, res, next) => {
  try {
    const { action, entity, user_id, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (entity) where.entity = entity;
    if (user_id) where.user_id = user_id;
    if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };
    if (req.user.role === 'inst_admin') where.institution_id = req.user.institution_id;

    const { count, rows } = await AuditLog.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ success: true, data: rows, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

module.exports = router;
