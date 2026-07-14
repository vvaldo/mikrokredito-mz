// src/services/notification/providers/whatsappProvider.js
// Envia via sessão WhatsApp Web autenticada (whatsapp-web.js) — sem API oficial da Meta.
const whatsappClient = require('../../whatsapp/whatsappClient');

async function send({ to, body }) {
  if (!to) throw new Error('WhatsApp recipient required');
  return whatsappClient.sendMessage(to, body);
}

module.exports = { send };
