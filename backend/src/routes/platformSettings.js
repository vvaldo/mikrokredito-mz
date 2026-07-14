// src/routes/platformSettings.js
const express = require('express');
const router = express.Router();
const { PlatformSetting } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// GET /platform-settings — público (login/topbar precisam antes de autenticar)
// Nunca deve derrubar a app com 500: branding é acessório, não crítico.
router.get('/', async (req, res) => {
  try {
    const row = await PlatformSetting.findByPk('default');
    res.json({ success: true, data: row?.data || {} });
  } catch (err) {
    res.json({ success: true, data: {} });
  }
});

// PUT /platform-settings — apenas super_admin
router.put('/', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const [row] = await PlatformSetting.findOrCreate({ where: { id: 'default' }, defaults: { data: {} } });
    const merged = { ...row.data, ...req.body };
    await row.update({ data: merged });
    res.json({ success: true, data: merged });
  } catch (err) { next(err); }
});

module.exports = router;
