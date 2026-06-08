// src/services/notification/providers/whatsappProvider.js
const axios = require('axios');
const logger = require('../../../utils/logger');

async function send({ to, body }) {
  if (!to) throw new Error('WhatsApp recipient required');

  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';

  if (provider === 'twilio') return sendViaTwilio(to, body);
  if (provider === 'meta') return sendViaMeta(to, body);

  throw new Error(`Unknown WhatsApp provider: ${provider}`);
}

async function sendViaTwilio(to, body) {
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = await twilio.messages.create({
    body,
    from: process.env.WHATSAPP_FROM,
    to: `whatsapp:${to}`,
  });
  logger.debug('WhatsApp sent via Twilio', { to, sid: message.sid });
  return { provider: 'twilio_whatsapp', messageId: message.sid };
}

async function sendViaMeta(to, body) {
  // Meta Cloud API
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    },
    { headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` } }
  );
  return { provider: 'meta_whatsapp', messageId: response.data?.messages?.[0]?.id };
}

module.exports = { send };
