const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const router = express.Router();
const { User, Client, Institution, AuditLog, Document } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { notifyAffectedUser } = require('../services/userActionNotifier');

function requiresInstitution(role){ return ['inst_admin','inst_agent','client'].includes(role); }

function safeUser(u){
  if(!u) return null;
  const j = u.toJSON ? u.toJSON() : u;
  delete j.password_hash; delete j.reset_token; delete j.verification_token;
  return j;
}

router.use(authenticate, authorize('super_admin'));

router.get('/', async (req,res,next)=>{
  try{
    const { role, status, q, institution_id } = req.query;
    const where = {};
    if(role) where.role = role;
    if(status) where.status = status;
    if(institution_id) where.institution_id = institution_id;
    if(q) where[Op.or] = [{ full_name:{[Op.iLike]:`%${q}%`} }, { email:{[Op.iLike]:`%${q}%`} }, { phone:{[Op.iLike]:`%${q}%`} }];
    const users = await User.findAll({ where, include:[{ model: Institution, attributes:['id','name','acronym'] }, { model: Client, include: [Document] }], order:[['created_at','DESC']] });
    res.json({ success:true, data: users.map(safeUser) });
  }catch(err){ next(err); }
});

router.post('/', async (req,res,next)=>{
  try{
    const { full_name, email, phone, role, status='active', institution_id=null, password='Mikro@2026' } = req.body;
    if(!full_name || !email || !role) return res.status(400).json({ success:false, message:'Nome, email e perfil são obrigatórios.' });
    if(requiresInstitution(role) && !institution_id) return res.status(400).json({ success:false, message:'Seleccione o banco/instituição para este perfil.' });
    const exists = await User.findOne({ where:{ email } });
    if(exists) return res.status(409).json({ success:false, message:'Já existe utilizador com este email.' });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, email, phone, role, status, institution_id: role === 'super_admin' ? null : institution_id, password_hash, email_verified:true });
    if(role === 'client') await Client.create({ user_id:user.id, kyc_status:'incomplete' });
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'user_created', entity:'User', entity_id:user.id, new_values:safeUser(user), description:`Utilizador ${email} criado` });
    await notifyAffectedUser({ user, actor:req.user, institutionId:user.institution_id, action:'user_created', subject:'Conta criada - MicroCredit SYSTEM', body:`<p>Prezado(a) ${user.full_name},</p><p>Foi criada uma conta para si no MicroCredit SYSTEM.</p><p>Email: <strong>${user.email}</strong></p>` });
    res.status(201).json({ success:true, data:safeUser(user) });
  }catch(err){ next(err); }
});

router.patch('/:id', async (req,res,next)=>{
  try{
    const user = await User.findByPk(req.params.id);
    if(!user) return res.status(404).json({ success:false, message:'Utilizador não encontrado.' });
    const before = safeUser(user);
    const allowed = ['full_name','email','phone','status','institution_id','avatar_url'];
    const patch = {};
    for(const k of allowed) if(Object.prototype.hasOwnProperty.call(req.body,k)) patch[k] = req.body[k];
    if(req.body.role && ['super_admin','inst_admin','inst_agent','client'].includes(req.body.role)) patch.role = req.body.role;
    if(patch.role === 'super_admin') patch.institution_id = null;
    if(requiresInstitution(patch.role || user.role) && !patch.institution_id && !user.institution_id) return res.status(400).json({ success:false, message:'Seleccione o banco/instituição para este perfil.' });
    await user.update(patch);
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'user_updated', entity:'User', entity_id:user.id, old_values:before, new_values:safeUser(user), description:`Utilizador ${user.email} actualizado` });
    await notifyAffectedUser({ user, actor:req.user, institutionId:user.institution_id, action:'user_updated', subject:'Dados de utilizador actualizados - MicroCredit SYSTEM', body:`<p>Prezado(a) ${user.full_name},</p><p>Os dados da sua conta foram actualizados por um administrador.</p>` });
    res.json({ success:true, data:safeUser(user) });
  }catch(err){ next(err); }
});

router.post('/:id/disable', async (req,res,next)=>{
  try{
    const user = await User.findByPk(req.params.id);
    if(!user) return res.status(404).json({ success:false, message:'Utilizador não encontrado.' });
    if(user.id === req.user.id) return res.status(400).json({ success:false, message:'Não pode desabilitar a sua própria conta.' });
    await user.update({ status:'inactive' });
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'user_disabled', entity:'User', entity_id:user.id, description:`Utilizador ${user.email} desabilitado` });
    await notifyAffectedUser({ user, actor:req.user, institutionId:user.institution_id, action:'user_disabled', subject:'Conta desabilitada - MicroCredit SYSTEM', body:`<p>Prezado(a) ${user.full_name},</p><p>A sua conta foi desabilitada.</p>` });
    res.json({ success:true, message:'Utilizador desabilitado.', data:safeUser(user) });
  }catch(err){ next(err); }
});

router.post('/:id/enable', async (req,res,next)=>{
  try{
    const user = await User.findByPk(req.params.id);
    if(!user) return res.status(404).json({ success:false, message:'Utilizador não encontrado.' });
    await user.update({ status:'active' });
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'user_enabled', entity:'User', entity_id:user.id, description:`Utilizador ${user.email} activado` });
    await notifyAffectedUser({ user, actor:req.user, institutionId:user.institution_id, action:'user_enabled', subject:'Conta activada - MicroCredit SYSTEM', body:`<p>Prezado(a) ${user.full_name},</p><p>A sua conta foi activada.</p>` });
    res.json({ success:true, message:'Utilizador activado.', data:safeUser(user) });
  }catch(err){ next(err); }
});


router.post('/:id/reset-password-manual', async (req,res,next)=>{
  try{
    const user = await User.findByPk(req.params.id);
    if(!user) return res.status(404).json({ success:false, message:'Utilizador não encontrado.' });
    const { new_password } = req.body;
    if(!new_password || String(new_password).length < 6) return res.status(400).json({ success:false, message:'A nova senha deve ter pelo menos 6 caracteres.' });
    await user.update({ password_hash: await bcrypt.hash(new_password, 12), reset_token:null, reset_token_expires:null });
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'user_password_reset_manual', entity:'User', entity_id:user.id, description:`Senha alterada manualmente pelo superadmin para ${user.email}` });
    await notifyAffectedUser({ user, actor:req.user, institutionId:user.institution_id, action:'user_password_reset_manual', subject:'Senha alterada pelo administrador - MicroCredit SYSTEM', body:`<p>Prezado(a) ${user.full_name},</p><p>A sua senha foi alterada manualmente pelo Super Admin.</p><p>Se não reconhece esta acção, contacte o suporte.</p>` });
    res.json({ success:true, message:'Senha alterada manualmente e utilizador notificado.' });
  }catch(err){ next(err); }
});

module.exports = router;
