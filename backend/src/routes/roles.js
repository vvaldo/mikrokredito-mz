const express = require('express');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const ROLE_CATALOG = [
  { key:'super_admin', label:'Super Admin', description:'Acesso global, aprova produtos, gere instituições, utilizadores e permissões.', permissions:['users.crud','roles.assign','products.approve','institutions.crud','loans.approve','payments.view','audit.view','reports.export','smtp.test'] },
  { key:'inst_admin', label:'Administrador/Gestor do Banco', description:'Gere clientes, produtos pendentes, pedidos, empréstimos, pagamentos e relatórios da instituição.', permissions:['clients.manage','products.create','loans.review','loans.approve_optional','payments.register','notifications.view','reports.export'] },
  { key:'inst_agent', label:'Agente de Crédito', description:'Simula, cadastra clientes, regista pedidos e documentos; aprova apenas se tiver permissão dada pelo superadmin.', permissions:['clients.create','loans.create','documents.upload','simulator.use'] },
  { key:'client', label:'Cliente', description:'Simula, submete pedidos, consulta documentos, notificações e os seus empréstimos.', permissions:['self.profile','self.documents','self.loans','self.notifications'] },
];

router.use(authenticate, authorize('super_admin'));

router.get('/', async (req,res)=> res.json({ success:true, data:ROLE_CATALOG }));

router.post('/assign', async (req,res,next)=>{
  try{
    const { user_id, role, institution_id } = req.body;
    if(!user_id || !role) return res.status(400).json({ success:false, message:'user_id e role são obrigatórios.' });
    if(!ROLE_CATALOG.some(r=>r.key===role)) return res.status(400).json({ success:false, message:'Perfil inválido.' });
    const user = await User.findByPk(user_id);
    if(!user) return res.status(404).json({ success:false, message:'Utilizador não encontrado.' });
    const old = { role:user.role, institution_id:user.institution_id };
    await user.update({ role, institution_id: role==='super_admin' ? null : (institution_id ?? user.institution_id) });
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'role_assigned', entity:'User', entity_id:user.id, old_values:old, new_values:{ role:user.role, institution_id:user.institution_id }, description:`Perfil de ${user.email} alterado para ${role}` });
    res.json({ success:true, message:'Perfil atribuído/alterado.', data:{ id:user.id, email:user.email, role:user.role, institution_id:user.institution_id } });
  }catch(err){ next(err); }
});

router.post('/disable/:user_id', async (req,res,next)=>{
  try{
    const user = await User.findByPk(req.params.user_id);
    if(!user) return res.status(404).json({ success:false, message:'Utilizador não encontrado.' });
    if(user.id === req.user.id) return res.status(400).json({ success:false, message:'Não pode desabilitar o seu próprio perfil.' });
    await user.update({ status:'inactive' });
    await AuditLog.create({ user_id:req.user.id, user_name:req.user.full_name, user_role:req.user.role, action:'role_disabled', entity:'User', entity_id:user.id, description:`Perfil/utilizador ${user.email} desabilitado` });
    res.json({ success:true, message:'Perfil desabilitado.' });
  }catch(err){ next(err); }
});

module.exports = router;
