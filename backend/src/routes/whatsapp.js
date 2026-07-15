// src/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const whatsappClient = require('../services/whatsapp/whatsappClient');

router.get('/status', authenticate, authorize('super_admin', 'inst_admin'), (req, res) => {
  res.json({ success: true, data: whatsappClient.getStatus() });
});

router.post('/connect', authenticate, authorize('super_admin', 'inst_admin'), (req, res) => {
  whatsappClient.initialize().catch(() => {});
  res.json({ success: true, message: 'A iniciar sessão do WhatsApp. Aguarde o código QR.' });
});

router.post('/logout', authenticate, authorize('super_admin', 'inst_admin'), async (req, res, next) => {
  try {
    await whatsappClient.logout();
    res.json({ success: true, message: 'Sessão do WhatsApp terminada.' });
  } catch (err) { next(err); }
});

router.post('/test', authenticate, authorize('super_admin', 'inst_admin'), async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ success: false, message: 'Indique o número e a mensagem.' });
    const result = await whatsappClient.sendMessage(to, message);
    res.json({ success: true, message: 'Mensagem de teste enviada.', data: result });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
});

module.exports = router;
