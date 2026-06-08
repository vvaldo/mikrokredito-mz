const express = require('express');
const router = express.Router();
const { Institution, User, LoanApplication, Client, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const multer = require('multer');



const logoDir = path.join(__dirname, '..', '..', 'uploads', 'logos');
fs.mkdirSync(logoDir, { recursive: true });
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, logoDir),
    filename: (req, file, cb) => cb(null, `logo-${req.params.id}-${Date.now()}${path.extname(file.originalname || '.png')}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!String(file.mimetype || '').startsWith('image/')) return cb(new Error('Apenas imagens são permitidas para logotipo'));
    cb(null, true);
  }
});

// GET / — list (super admin sees all; inst admin sees own)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = req.user.role !== 'super_admin' ? { id: req.user.institution_id } : {};
    const institutions = await Institution.findAll({ where, order: [['name', 'ASC']] });
    res.json({ success: true, data: institutions });
  } catch (err) { next(err); }
});

// GET /:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin' && req.user.institution_id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const inst = await Institution.findByPk(req.params.id, { include: [{ model: User, attributes: ['id','full_name','role','status'] }] });
    if (!inst) return res.status(404).json({ success: false, message: 'Não encontrada' });
    res.json({ success: true, data: inst });
  } catch (err) { next(err); }
});

// POST / — create (super admin only)
router.post('/', authenticate, authorize('super_admin'), audit('institution_created'), async (req, res, next) => {
  try {
    const inst = await Institution.create({ id: uuidv4(), ...req.body, status: 'pending' });
    res.status(201).json({ success: true, data: inst });
  } catch (err) { next(err); }
});

// PATCH /:id
router.patch('/:id', authenticate, authorize('super_admin', 'inst_admin'), audit('institution_updated'), async (req, res, next) => {
  try {
    if (req.user.role === 'inst_admin' && req.user.institution_id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const inst = await Institution.findByPk(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Não encontrada' });
    await inst.update(req.body);
    res.json({ success: true, data: inst });
  } catch (err) { next(err); }
});




// PATCH /:id/branding — SaaS identity. Superadmin only.
router.patch('/:id/branding', authenticate, authorize('super_admin'), audit('institution_branding_updated'), async (req, res, next) => {
  try {
    const inst = await Institution.findByPk(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instituição não encontrada' });

    const allowed = ['app_name', 'app_subtitle', 'footer_title', 'footer_subtitle', 'powered_by_name', 'powered_by_url', 'primary_color', 'secondary_color', 'login_features'];
    const currentSettings = inst.settings || {};
    const currentBranding = currentSettings.branding || {};
    const incoming = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body, key)) incoming[key] = req.body[key];

    const nextSettings = {
      ...currentSettings,
      branding: { ...currentBranding, ...incoming }
    };
    await inst.update({ settings: nextSettings });
    res.json({ success: true, message: 'Identidade SaaS actualizada', data: inst });
  } catch (err) { next(err); }
});

// POST /:id/logo — upload tenant logo. Superadmin only.
router.post('/:id/logo', authenticate, authorize('super_admin'), logoUpload.single('logo'), audit('institution_logo_updated'), async (req, res, next) => {
  try {
    const inst = await Institution.findByPk(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instituição não encontrada' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Ficheiro de logotipo é obrigatório' });

    // Remove previous tenant logo when it is inside our uploads/logos folder.
    if (inst.logo_url && inst.logo_url.startsWith('/uploads/logos/')) {
      const oldPath = path.join(__dirname, '..', '..', inst.logo_url.replace(/^\//, ''));
      fs.promises.unlink(oldPath).catch(() => {});
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await inst.update({ logo_url: logoUrl });
    res.json({ success: true, message: 'Logotipo actualizado', data: { id: inst.id, logo_url: logoUrl, logo_url_cache_bust: `${logoUrl}?v=${Date.now()}` } });
  } catch (err) { next(err); }
});


// GET /:id/stats
router.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    const [clients, applications] = await Promise.all([
      Client.count({ include: [{ model: require('../models').User, where: { institution_id: id } }] }),
      LoanApplication.findAll({ where: { institution_id: id }, attributes: ['status', [require('sequelize').fn('COUNT','*'), 'count'], [require('sequelize').fn('SUM', require('sequelize').col('requested_amount')), 'total']], group: ['status'], raw: true }),
    ]);
    res.json({ success: true, data: { clients, applications } });
  } catch (err) { next(err); }
});


// POST /:id/activate — activate bank/institution
router.post('/:id/activate', authenticate, authorize('super_admin'), audit('institution_activated'), async (req, res, next) => {
  try {
    const inst = await Institution.findByPk(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instituição não encontrada' });
    await inst.update({ status: 'active' });
    res.json({ success: true, message: 'Instituição activada', data: inst });
  } catch (err) { next(err); }
});

// POST /:id/suspend — inactivate/suspend bank/institution
router.post('/:id/suspend', authenticate, authorize('super_admin'), audit('institution_suspended'), async (req, res, next) => {
  try {
    const inst = await Institution.findByPk(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instituição não encontrada' });
    await inst.update({ status: 'suspended' });
    res.json({ success: true, message: 'Instituição inactivada/suspensa', data: inst });
  } catch (err) { next(err); }
});

// DELETE /:id — delete bank/institution only when no users are linked
router.delete('/:id', authenticate, authorize('super_admin'), audit('institution_deleted'), async (req, res, next) => {
  try {
    const inst = await Institution.findByPk(req.params.id);
    if (!inst) return res.status(404).json({ success: false, message: 'Instituição não encontrada' });
    const users = await User.count({ where: { institution_id: inst.id } });
    if (users > 0) return res.status(409).json({ success: false, message: 'Não pode apagar: existem utilizadores associados. Inactive primeiro ou remova os vínculos.' });
    await inst.destroy();
    res.json({ success: true, message: 'Instituição apagada' });
  } catch (err) { next(err); }
});

module.exports = router;
