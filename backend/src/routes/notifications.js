// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { NotificationTemplate, NotificationRule, NotificationLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { retryFailed, getStats, triggerEvent } = require('../services/notification/notificationService');
const { Op } = require('sequelize');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};



// ────────────────────────────────
// CLIENT/USER NOTIFICATIONS
// ────────────────────────────────
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, unread } = req.query;
    const ids = [req.user.id];
    if (req.user.role === 'client') {
      const { Client } = require('../models');
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      if (client) ids.push(client.id);
    }
    const where = { recipient_id: { [Op.in]: ids } };
    if (unread === '1' || unread === 'true') where.read_at = { [Op.is]: null };
    const rows = await NotificationLog.findAll({ where, order: [['created_at','DESC']], limit: parseInt(limit) });
    res.json({ success: true, data: rows, unread: rows.filter(r => !r.read_at).length });
  } catch (err) { next(err); }
});

router.get('/my/unread-count', authenticate, async (req, res, next) => {
  try {
    const ids = [req.user.id];
    if (req.user.role === 'client') {
      const { Client } = require('../models');
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      if (client) ids.push(client.id);
    }
    const count = await NotificationLog.count({ where: { recipient_id: { [Op.in]: ids }, read_at: { [Op.is]: null } } });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
});

router.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    const log = await NotificationLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success:false, message:'Notificação não encontrada' });
    const allowed = log.recipient_id === req.user.id;
    let allowedClient = false;
    if (req.user.role === 'client') {
      const { Client } = require('../models');
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      allowedClient = client && log.recipient_id === client.id;
    }
    if (!allowed && !allowedClient && req.user.role !== 'super_admin' && req.user.institution_id !== log.institution_id) {
      return res.status(403).json({ success:false, message:'Sem permissão para ler esta notificação' });
    }
    await log.update({ read_at: log.read_at || new Date(), read_by: req.user.id });
    res.json({ success:true, data: log });
  } catch (err) { next(err); }
});

// ────────────────────────────────
// TEMPLATES
// ────────────────────────────────

router.get('/templates', authenticate, async (req, res, next) => {
  try {
    const { institution_id, channel, key } = req.query;
    const where = {};
    if (channel) where.channel = channel;
    if (key) where.key = key;
    if (institution_id) {
      where.institution_id = institution_id;
    } else if (req.user.role !== 'super_admin') {
      // Vê os templates globais (institution_id nulo) e os da própria instituição.
      where.institution_id = { [Op.or]: [req.user.institution_id, null] };
    }

    const templates = await NotificationTemplate.findAll({ where, order: [['key', 'ASC'], ['channel', 'ASC']] });
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

router.post('/templates',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  [
    body('key').notEmpty(),
    body('channel').isIn(['email', 'sms', 'whatsapp']),
    body('body').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { key, channel, language = 'pt', subject, body: tmplBody, variables = [], institution_id } = req.body;
      const instId = req.user.role === 'super_admin' ? institution_id : req.user.institution_id;

      const template = await NotificationTemplate.create({
        key, channel, language, subject, body: tmplBody, variables,
        institution_id: instId || null,
      });
      res.status(201).json({ success: true, data: template });
    } catch (err) { next(err); }
  }
);

router.put('/templates/:id',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const template = await NotificationTemplate.findByPk(req.params.id);
      if (!template) return res.status(404).json({ success: false, message: 'Template não encontrado' });

      await template.update(req.body);
      res.json({ success: true, data: template });
    } catch (err) { next(err); }
  }
);

router.delete('/templates/:id',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  async (req, res, next) => {
    try {
      await NotificationTemplate.destroy({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Template eliminado' });
    } catch (err) { next(err); }
  }
);

// ────────────────────────────────
// RULES
// ────────────────────────────────

router.get('/rules', authenticate, async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role !== 'super_admin') where.institution_id = { [Op.or]: [req.user.institution_id, null] };
    const rules = await NotificationRule.findAll({ where, order: [['event', 'ASC']] });
    res.json({ success: true, data: rules });
  } catch (err) { next(err); }
});

router.post('/rules',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  [body('event').notEmpty(), body('channels').isArray()],
  validate,
  async (req, res, next) => {
    try {
      const rule = await NotificationRule.create({
        ...req.body,
        institution_id: req.user.role === 'super_admin' ? req.body.institution_id : req.user.institution_id,
      });
      res.status(201).json({ success: true, data: rule });
    } catch (err) { next(err); }
  }
);

router.put('/rules/:id', authenticate, authorize('inst_admin', 'super_admin'), async (req, res, next) => {
  try {
    const rule = await NotificationRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Regra não encontrada' });
    await rule.update(req.body);
    res.json({ success: true, data: rule });
  } catch (err) { next(err); }
});

// ────────────────────────────────
// LOGS & HISTORY
// ────────────────────────────────

router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const { status, channel, event, from, to, page = 1, limit = 50, recipient } = req.query;
    const where = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (event) where.event = event;
    if (from && to) where.created_at = { [Op.between]: [new Date(from), new Date(to)] };
    if (recipient) where[Op.or] = [
      { recipient_email: { [Op.iLike]: `%${recipient}%` } },
      { recipient_phone: { [Op.like]: `%${recipient}%` } },
    ];
    if (req.user.role !== 'super_admin') where.institution_id = req.user.institution_id;

    const { count, rows } = await NotificationLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ success: true, data: rows, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// ────────────────────────────────
// RETRY & MANUAL SEND
// ────────────────────────────────

router.post('/retry',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const institutionId = req.user.role === 'super_admin' ? req.body.institution_id : req.user.institution_id;
      const queued = await retryFailed(institutionId);
      res.json({ success: true, message: `${queued} notificações colocadas em fila de reenvio` });
    } catch (err) { next(err); }
  }
);

router.post('/retry/:id', authenticate, authorize('inst_admin', 'super_admin'), async (req, res, next) => {
  try {
    const log = await NotificationLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log não encontrado' });

    const { notificationQueue } = require('../queues');
    await notificationQueue.add('send-notification', { logId: log.id }, { attempts: 1 });
    await log.update({ status: 'queued', next_retry_at: new Date() });

    res.json({ success: true, message: 'Notificação colocada em fila para reenvio' });
  } catch (err) { next(err); }
});

// ────────────────────────────────
// STATS & TEST
// ────────────────────────────────

router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { from = new Date(Date.now() - 30 * 24 * 3600 * 1000), to = new Date() } = req.query;
    const institutionId = req.user.role === 'super_admin' ? req.query.institution_id : req.user.institution_id;
    const stats = await getStats(institutionId, from, to);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

// Test notification
router.post('/test',
  authenticate,
  authorize('inst_admin', 'super_admin'),
  [body('event').notEmpty(), body('channel').isIn(['email', 'sms', 'whatsapp'])],
  validate,
  async (req, res, next) => {
    try {
      const { event, channel, recipient, data = {} } = req.body;
      await triggerEvent(event, {
        institutionId: req.user.institution_id,
        recipientEmail: channel === 'email' ? recipient : undefined,
        recipientPhone: channel !== 'email' ? recipient : undefined,
        data,
      });
      res.json({ success: true, message: 'Notificação de teste enviada' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
