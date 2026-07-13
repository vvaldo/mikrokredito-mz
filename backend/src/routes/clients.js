const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Client, User, Document, LoanApplication } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { notifyAffectedUser } = require('../services/userActionNotifier');

const safeUserAttrs = { exclude: ['password_hash', 'reset_token', 'verification_token'] };

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const client = await Client.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, attributes: safeUserAttrs },
        { model: Document },
        { model: LoanApplication, limit: 20, order: [['created_at', 'DESC']] },
      ],
      order: [[Document, 'created_at', 'DESC']],
    });
    if (!client) return res.status(404).json({ success: false, message: 'Perfil de cliente não encontrado' });
    res.json({ success: true, data: client });
  } catch (err) { next(err); }
});

router.patch('/me', authenticate, audit('client_profile_updated'), async (req, res, next) => {
  try {
    const client = await Client.findOne({ where: { user_id: req.user.id }, include: [User] });
    if (!client) return res.status(404).json({ success: false, message: 'Perfil de cliente não encontrado' });
    const userPayload = {};
    for (const k of ['full_name', 'phone', 'email']) if (req.body[k] !== undefined) userPayload[k] = req.body[k];
    if (Object.keys(userPayload).length) await client.User.update(userPayload);
    const clientPayload = {};
    // Cliente NÃO altera salário: mensal_income é reservado ao gestor.
    for (const k of ['bi_number','nuit','date_of_birth','gender','marital_status','nationality','province','district','address','birth_place','activity_type','employment_type','employer_name','employer_location','business_name','doc_type','doc_issue_date','doc_expiry_date','dependents','guarantors','photo_url','kyc_status','kyc_notes','crc_status','crc_comment','credit_score','monthly_income']) {
      if (req.body[k] !== undefined) clientPayload[k] = req.body[k];
    }
    if (Object.keys(clientPayload).length) await client.update(clientPayload);
    const fresh = await Client.findByPk(client.id, { include: [{ model: User, attributes: safeUserAttrs }, { model: Document }] });
    await notifyAffectedUser({ user: fresh.User, actor: req.user, institutionId: req.user.institution_id, action: 'client_profile_updated', subject: 'Dados do perfil actualizados - MicroCredit SYSTEM', body: `<p>Prezado(a) ${fresh.User.full_name},</p><p>Os seus dados de perfil/KYC foram actualizados.</p><p>Se não reconhece esta alteração, contacte a instituição.</p>`, metadata: { client_id: fresh.id } });
    res.json({ success: true, message: 'Perfil gravado na base de dados', data: fresh });
  } catch (err) { next(err); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { kyc_status, page = 1, limit = 100, search } = req.query;
    const where = {};
    if (kyc_status) where.kyc_status = kyc_status;
    const userWhere = { role: 'client' };
    if (search) userWhere[Op.or] = [
      { full_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
    ];
    const { count, rows } = await Client.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id','full_name','email','phone','status','created_at'], where: userWhere },
        { model: Document },
        { model: LoanApplication, limit: 3, order: [['created_at','DESC']] },
      ],
      distinct: true,
      limit: parseInt(limit),
      offset: (parseInt(page)-1)*parseInt(limit),
      order: [['created_at','DESC']],
    });
    res.json({ success: true, data: rows, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('inst_admin','inst_agent','super_admin'), audit('client_created_by_staff'), async (req, res, next) => {
  try {
    const { full_name, email, phone, bi_number, nuit, monthly_income, address, province, district, crc_status, crc_comment } = req.body;
    if (!full_name || !email) return res.status(400).json({ success:false, message:'Nome e email são obrigatórios' });
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ success:false, message:'Já existe utilizador com este email' });
    const password_hash = await bcrypt.hash(req.body.password || 'Cliente@123', 10);
    const user = await User.create({ id: uuidv4(), institution_id: null, full_name, email, phone, password_hash, role: 'client', status: 'active', email_verified: true });
    const client = await Client.create({ id: uuidv4(), user_id: user.id, bi_number, nuit, monthly_income, address, province, district, crc_status, crc_comment, kyc_status: 'incomplete' });
    const fresh = await Client.findByPk(client.id, { include: [{ model: User, attributes: safeUserAttrs }, { model: Document }] });
    res.status(201).json({ success:true, data:fresh });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: [{ model: User, attributes: safeUserAttrs }, { model: Document }, { model: LoanApplication, limit: 10, order: [['created_at','DESC']] }] });
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    res.json({ success: true, data: client });
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('inst_admin','inst_agent','super_admin'), audit('client_updated'), async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: [User] });
    if (!client) return res.status(404).json({ success: false, message: 'Não encontrado' });
    const userPayload = {};
    for (const k of ['full_name','email','phone','status']) if (req.body[k] !== undefined) userPayload[k] = req.body[k];
    if (Object.keys(userPayload).length) await client.User.update(userPayload);
    const clientPayload = {};
    for (const k of ['bi_number','nuit','date_of_birth','gender','marital_status','nationality','province','district','address','activity_type','business_name','monthly_income','kyc_status','kyc_notes','credit_score','crc_status','crc_comment','doc_type','doc_issue_date','doc_expiry_date','birth_place','employment_type','employer_name','employer_location','dependents','guarantors','photo_url']) {
      if (req.body[k] !== undefined) clientPayload[k] = req.body[k];
    }
    if (Object.keys(clientPayload).length) await client.update(clientPayload);
    const fresh = await Client.findByPk(client.id, { include: [{ model: User, attributes: safeUserAttrs }, { model: Document }] });
    await notifyAffectedUser({ user: fresh.User, actor: req.user, institutionId: req.user.institution_id, action: 'client_updated_by_staff', subject: 'Dados actualizados pela instituição - MicroCredit SYSTEM', body: `<p>Prezado(a) ${fresh.User.full_name},</p><p>A instituição actualizou dados no seu perfil.</p>`, metadata: { client_id: fresh.id } });
    res.json({ success: true, data: fresh });
  } catch (err) { next(err); }
});

router.post('/:id/block', authenticate, authorize('inst_admin','super_admin'), audit('client_blocked'), async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: [User] });
    if (!client) return res.status(404).json({ success:false, message:'Cliente não encontrado' });
    const status = req.body.blocked === false ? 'active' : 'blocked';
    await client.User.update({ status });
    await notifyAffectedUser({ user: client.User, actor: req.user, institutionId: req.user.institution_id, action: status === 'blocked' ? 'client_blocked' : 'client_unblocked', subject: status === 'blocked' ? 'Conta bloqueada - MicroCredit SYSTEM' : 'Conta desbloqueada - MicroCredit SYSTEM', body: `<p>Prezado(a) ${client.User.full_name},</p><p>O estado da sua conta foi alterado para: <strong>${status}</strong>.</p>` });
    res.json({ success:true, message: status === 'blocked' ? 'Cliente bloqueado' : 'Cliente desbloqueado', data: client });
  } catch (err) { next(err); }
});

router.post('/:id/approve-kyc', authenticate, authorize('inst_admin', 'inst_agent', 'super_admin'), audit('kyc_approved'), async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: [User] });
    if (!client) return res.status(404).json({ success: false, message: 'Não encontrado' });
    await client.update({ kyc_status: req.body.approved ? 'approved' : 'rejected', kyc_reviewed_by: req.user.id, kyc_reviewed_at: new Date(), kyc_notes: req.body.notes });
    const event = req.body.approved ? 'kyc_approved' : 'kyc_rejected';
    const { triggerEvent } = require('../services/notification/notificationService');
    await triggerEvent(event, { institutionId: req.user.institution_id, recipientEmail: client.User?.email, recipientPhone: client.User?.phone, data: { clientName: client.User?.full_name } });
    res.json({ success: true, data: client });
  } catch (err) { next(err); }
});

module.exports = router;
