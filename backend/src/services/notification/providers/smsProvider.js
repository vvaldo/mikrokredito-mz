// src/services/notification/providers/smsProvider.js
const axios = require('axios');
const logger = require('../../../utils/logger');

/**
 * Send SMS via Mozambique SMS Gateway (primary) or Twilio (fallback)
 */
async function send({ to, body }) {
  if (!to) throw new Error('SMS recipient phone number is required');

  const phone = normalizePhone(to);

  try {
    return await sendViaMzGateway(phone, body);
  } catch (err) {
    logger.warn('MZ SMS gateway failed, falling back to Twilio', { error: err.message });
    return await sendViaTwilio(phone, body);
  }
}

async function sendViaMzGateway(to, body) {
  const response = await axios.post(
    process.env.MZ_SMS_GATEWAY_URL,
    { to, message: body, sender: process.env.MZ_SMS_SENDER || 'MicroCredit' },
    {
      headers: { 'Authorization': `Bearer ${process.env.MZ_SMS_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    }
  );

  if (!response.data?.success && response.data?.status !== 'queued') {
    throw new Error(response.data?.message || 'MZ Gateway error');
  }

  logger.debug('SMS sent via MZ gateway', { to, messageId: response.data?.message_id });
  return { provider: 'mz_gateway', messageId: response.data?.message_id };
}

async function sendViaTwilio(to, body) {
  const twilio = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const message = await twilio.messages.create({
    body,
    from: process.env.TWILIO_FROM,
    to,
  });

  logger.debug('SMS sent via Twilio', { to, sid: message.sid });
  return { provider: 'twilio', messageId: message.sid };
}

function normalizePhone(phone) {
  // Ensure +258 prefix for Mozambique numbers
  const clean = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('258')) return `+${clean}`;
  if (clean.startsWith('8') && clean.length === 9) return `+258${clean}`;
  return clean;
}

module.exports = { send };
