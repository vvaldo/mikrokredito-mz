const express = require('express');
const router = express.Router();
const { CreditProduct, Institution } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { v4: uuidv4 } = require('uuid');
const { notifyAffectedUser } = require('../services/userActionNotifier');

router.get('/', async (req, res, next) => {
  try {
    const { institution_id, include_pending } = req.query;
    const where = {};
    if (!include_pending) Object.assign(where, { is_visible: true, status: 'active' });
    if (institution_id) where.institution_id = institution_id;
    const products = await CreditProduct.findAll({ where, include: [{ model: Institution, attributes: ['id','name','acronym','color','province'] }], order: [['created_at','DESC']] });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.get('/admin', authenticate, authorize('inst_admin','inst_agent','super_admin'), async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role !== 'super_admin') where.institution_id = req.user.institution_id;
    const products = await CreditProduct.findAll({ where, include: [{ model: Institution }], order: [['created_at','DESC']] });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try { const p = await CreditProduct.findByPk(req.params.id, { include: [Institution] }); if (!p) return res.status(404).json({ success:false, message:'Produto não encontrado' }); res.json({ success:true, data:p }); }
  catch (err) { next(err); }
});

router.post('/', authenticate, authorize('inst_admin','super_admin'), audit('product_created'), async (req, res, next) => {
  try {
    const instId = req.user.role === 'super_admin' ? req.body.institution_id : req.user.institution_id;
    const pending = req.user.role !== 'super_admin';
    const product = await CreditProduct.create({ id: uuidv4(), ...req.body, institution_id: instId, status: pending ? 'inactive' : (req.body.status || 'active'), is_visible: pending ? false : (req.body.is_visible ?? true) });
    await notifyAffectedUser({ user:req.user, actor:req.user, institutionId:instId, action:'product_created', subject:'Produto de crédito criado - MicroCredit SYSTEM', body:`<p>Foi criado o produto <strong>${product.name}</strong>.</p><p>Estado: ${pending ? 'pendente de aprovação do Super Admin' : 'activo'}.</p>`, metadata:{ product_id: product.id } });
    res.status(201).json({ success:true, message: pending ? 'Produto criado e pendente de aprovação do Super Admin.' : 'Produto criado e activo.', data: product });
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('super_admin'), audit('product_updated'), async (req, res, next) => {
  try { const p = await CreditProduct.findByPk(req.params.id); if (!p) return res.status(404).json({ success:false, message:'Não encontrado' }); await p.update(req.body); await notifyAffectedUser({ user:req.user, actor:req.user, institutionId:p.institution_id, action:'product_updated', subject:'Produto de crédito actualizado - MicroCredit SYSTEM', body:`<p>O produto <strong>${p.name}</strong> foi actualizado.</p>`, metadata:{ product_id:p.id } }); res.json({ success:true, data:p }); }
  catch (err) { next(err); }
});

router.post('/:id/approve', authenticate, authorize('super_admin', 'inst_admin'), audit('product_approved'), async (req, res, next) => {
  try {
    const p = await CreditProduct.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success:false, message:'Não encontrado' });
    if (req.user.role === 'inst_admin' && req.user.institution_id !== p.institution_id) {
      return res.status(403).json({ success:false, message:'Só pode aprovar produtos da sua instituição' });
    }
    await p.update({ status: 'active', is_visible: true });
    await notifyAffectedUser({ user:req.user, actor:req.user, institutionId:p.institution_id, action:'product_approved', subject:'Produto aprovado - MicroCredit SYSTEM', body:`<p>O produto <strong>${p.name}</strong> foi aprovado e está disponível no simulador.</p>`, metadata:{ product_id:p.id } });
    res.json({ success:true, message:'Produto aprovado e disponível no simulador.', data:p });
  }
  catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('super_admin'), audit('product_deleted'), async (req, res, next) => {
  try { const p = await CreditProduct.findByPk(req.params.id); if (!p) return res.status(404).json({ success:false, message:'Não encontrado' }); await p.update({ status:'inactive', is_visible:false }); res.json({ success:true, message:'Produto desactivado' }); }
  catch (err) { next(err); }
});

module.exports = router;
