const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

router.get('/', authenticate, authorize('super_admin', 'inst_admin'), async (req, res, next) => {
  try {
    const { action, entity, entity_id, entity_id_in, user_id, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (entity) where.entity = entity;
    // entity_id_in: usado para reunir o histórico "de um empréstimo" (o próprio empréstimo,
    // o pedido de origem e os pagamentos associados são registados com entity_id diferentes —
    // esta é a forma de trazer os três num único pedido, sem inventar histórico).
    if (entity_id_in) where.entity_id = { [Op.in]: String(entity_id_in).split(',').filter(Boolean) };
    else if (entity_id) where.entity_id = entity_id;
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
