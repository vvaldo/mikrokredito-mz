const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { User, Client, Institution } = require('../models');
const { authenticate } = require('../middleware/auth');
const { triggerEvent } = require('../services/notification/notificationService');

const crypto = require('crypto');
const { NotificationLog } = require('../models');
const emailProvider = require('../services/notification/providers/emailProvider');

async function sendResetEmail(user, token) {
  const subject = 'Token para redefinição de senha - MicroCredit SYSTEM';
  const body = `<p>Prezado(a) ${user.full_name},</p><p>O seu token de redefinição de senha é:</p><h2 style="letter-spacing:4px">${token}</h2><p>Este token expira em 15 minutos.</p>`;
  const log = await NotificationLog.create({
    recipient_id: user.id, recipient_email: user.email, recipient_phone: user.phone,
    channel: 'email', event: 'password_reset_requested', subject, body,
    status: 'sending', attempts: 1, max_attempts: 3,
  });
  try {
    const info = await emailProvider.send({ to: user.email, subject, body });
    await log.update({ status: 'sent', provider: info.provider, provider_message_id: info.messageId, sent_at: new Date(), error_message: null });
    return info;
  } catch (err) {
    await log.update({ status: 'failed', error_message: err.message });
    err.status = 502;
    err.message = 'Token gerado, mas o email não foi enviado por falha SMTP: ' + err.message;
    throw err;
  }
}


const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}


// POST /auth/forgot-password — public login-page flow
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ where: { email: req.body.email } });
      if (!user) return res.status(404).json({ success: false, message: 'Email não encontrado na base de dados. Nenhum token foi enviado.' });
      const token = String(Math.floor(100000 + Math.random() * 900000));
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await user.update({ reset_token: tokenHash, reset_token_expires: new Date(Date.now() + 15 * 60 * 1000) });
      await sendResetEmail(user, token);
      res.json({ success: true, message: 'Token enviado para o email informado.' });
    } catch (err) { next(err); }
  }
);

// POST /auth/reset-password — public token validation
router.post('/reset-password',
  [body('email').isEmail().normalizeEmail(), body('token').isLength({ min: 6, max: 12 }), body('new_password').isLength({ min: 6 })],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ where: { email: req.body.email } });
      if (!user) return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
      const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
      if (!user.reset_token || user.reset_token !== tokenHash || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
        return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
      }
      await user.update({ password_hash: await bcrypt.hash(req.body.new_password, 12), reset_token: null, reset_token_expires: null });
      await NotificationLog.create({ recipient_id: user.id, recipient_email: user.email, recipient_phone: user.phone, channel: 'email', event: 'password_reset_completed', subject: 'Senha alterada - MicroCredit SYSTEM', body: 'A sua senha foi redefinida com sucesso.', status: 'queued', attempts: 0 });
      res.json({ success: true, message: 'Senha redefinida com sucesso. Já pode entrar.' });
    } catch (err) { next(err); }
  }
);

// POST /auth/register
router.post('/register',
  [
    body('full_name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { full_name, email, phone, password } = req.body;
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ success: false, message: 'Email já registado' });

      const password_hash = await bcrypt.hash(password, 12);
      const user = await User.create({ id: uuidv4(), full_name, email, phone, password_hash, role: 'client' });
      const client = await Client.create({
        id: uuidv4(),
        user_id:          user.id,
        // Basic
        date_of_birth:    req.body.date_of_birth    || null,
        gender:           req.body.gender            || null,
        marital_status:   req.body.marital_status    || null,
        nationality:      req.body.nationality       || 'Mozambican',
        dependents:       parseInt(req.body.dependents) || 0,
        // Document
        doc_type:         req.body.doc_type          || 'BI',
        bi_number:        req.body.bi_number         || null,
        nuit:             req.body.nuit              || null,
        doc_issue_date:   req.body.doc_issue_date    || null,
        doc_expiry_date:  req.body.doc_expiry_date   || null,
        // Address
        birth_place:      req.body.birth_place       || null,
        province:         req.body.province          || null,
        district:         req.body.district          || null,
        address:          req.body.address           || null,
        // Work
        activity_type:    req.body.activity_type     || null,
        employment_type:  req.body.employment_type   || null,
        employer_name:    req.body.employer_name     || null,
        employer_location:req.body.employer_location || null,
        monthly_income:   parseFloat(req.body.monthly_income) || 0,
        // Extra
        guarantors:       req.body.guarantors        || [],
        photo_url:        req.body.photoBase64       || null,
        kyc_status:       'incomplete',
      });

      await triggerEvent('client_registered', {
        recipientEmail: email,
        recipientPhone: phone,
        data: { clientName: full_name },
      });

      res.status(201).json({ success: true, message: 'Conta criada. Verifique o seu email.', data: { client: { id: client.id } } });
    } catch (err) { next(err); }
  }
);

// POST /auth/login
router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email }, include: [Institution] });
      if (!user) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
      if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Conta inactiva' });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ success: false, message: 'Credenciais inválidas' });

      await user.update({ last_login: new Date() });
      const token = signToken(user);

      res.json({
        success: true,
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role,
          institution_id: user.institution_id, institution: user.Institution },
      });
    } catch (err) { next(err); }
  }
);

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { include: [Institution], attributes: { exclude: ['password_hash', 'reset_token', 'verification_token'] } });
    res.json({ success: true, data: { ...user.toJSON(), institution: user.Institution } });
  } catch (err) { next(err); }
});


// PATCH /auth/me - update own basic profile for any authenticated role
router.patch('/me', authenticate,
  [body('full_name').optional().trim().notEmpty(), body('email').optional().isEmail().normalizeEmail(), body('phone').optional().trim()],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, { include: [Institution] });
      const patch = {};
      for (const k of ['full_name','email','phone']) if (Object.prototype.hasOwnProperty.call(req.body, k)) patch[k] = req.body[k];
      if (patch.email && patch.email !== user.email) {
        const exists = await User.findOne({ where: { email: patch.email } });
        if (exists && exists.id !== user.id) return res.status(409).json({ success:false, message:'Este email já está em uso.' });
      }
      await user.update(patch);
      res.json({ success:true, data: { id:user.id, full_name:user.full_name, email:user.email, phone:user.phone, role:user.role, institution_id:user.institution_id, institution:user.Institution } });
    } catch (err) { next(err); }
  }
);

// POST /auth/change-password
router.post('/change-password', authenticate,
  [body('current').notEmpty(), body('new_password').isLength({ min: 6 })],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);
      const ok = await bcrypt.compare(req.body.current, user.password_hash);
      if (!ok) return res.status(400).json({ success: false, message: 'Palavra-passe actual incorrecta' });
      await user.update({ password_hash: await bcrypt.hash(req.body.new_password, 12) });
      res.json({ success: true, message: 'Palavra-passe alterada' });
    } catch (err) { next(err); }
  }
);


// POST /auth/request-password-reset-token — sends token by email and stores hash in DB
router.post('/request-password-reset-token', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilizador não encontrado' });
    const channel = req.body.channel || 'email';
    const token = String(Math.floor(100000 + Math.random() * 900000));
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await user.update({ reset_token: tokenHash, reset_token_expires: new Date(Date.now() + 15 * 60 * 1000) });

    if (channel !== 'email') {
      // SMS/WhatsApp dependem de gateway externo; guardamos log claro enquanto o provedor não estiver configurado.
      await NotificationLog.create({ recipient_id: user.id, recipient_email: user.email, recipient_phone: user.phone, channel: channel === 'whatsapp' ? 'whatsapp' : 'sms', event: 'password_reset_requested', body: `Token: ${token}`, status: 'queued', attempts: 0, metadata: { requires_provider_configuration: true } });
      return res.json({ success: true, message: 'Token gerado. Configure o provedor SMS/WhatsApp para envio automático.', channel });
    }

    await sendResetEmail(user, token);
    res.json({ success: true, message: 'Token enviado para o email do cliente.', channel: 'email' });
  } catch (err) { next(err); }
});

// POST /auth/reset-password-with-token — validates token and persists new password in DB
router.post('/reset-password-with-token', authenticate,
  [body('token').isLength({ min: 6, max: 12 }), body('new_password').isLength({ min: 6 })],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id);
      const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
      if (!user.reset_token || user.reset_token !== tokenHash || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
        return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
      }
      await user.update({ password_hash: await bcrypt.hash(req.body.new_password, 12), reset_token: null, reset_token_expires: null });
      res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
