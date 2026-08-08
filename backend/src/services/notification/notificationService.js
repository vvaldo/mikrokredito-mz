// src/services/notification/notificationService.js
const Handlebars = require('handlebars');
const { NotificationTemplate, NotificationRule, NotificationLog, Institution } = require('../../models');
const emailProvider    = require('./providers/emailProvider');
const smsProvider      = require('./providers/smsProvider');
const whatsappProvider = require('./providers/whatsappProvider');
const logger = require('../../utils/logger');
const { htmlToWhatsAppText } = require('../../utils/htmlToWhatsAppText');

const PROVIDERS = { email: emailProvider, sms: smsProvider, whatsapp: whatsappProvider };

// Lazy getter — avoids circular require at module load time
function getQueue() {
  return require('../../queues').notificationQueue;
}

async function triggerEvent(event, context) {
  try {
    const { institutionId, clientId, recipientEmail, recipientPhone, data } = context;

    const rules = await NotificationRule.findAll({
      where: { event, is_active: true },
    });

    const institution = institutionId
      ? await Institution.findByPk(institutionId)
      : null;

    for (const rule of rules) {
      const channels = rule.channels.filter(ch => {
        if (institution) {
          if (ch === 'email'    && !institution.notif_email_enabled)    return false;
          if (ch === 'sms'      && !institution.notif_sms_enabled)      return false;
          if (ch === 'whatsapp' && !institution.notif_whatsapp_enabled) return false;
        }
        return true;
      });

      // app_name/app_url são anunciados na UI de templates como variáveis sempre disponíveis,
      // mas nunca eram passados pelos triggers concretos (loan_submitted, payment_received, ...)
      // — um template com {{app_name}}/{{app_url}} renderizava esses trechos vazios. Iguala aqui
      // o que é realmente substituído ao que a UI promete.
      const renderData = { ...data, app_name: institution?.name || 'MicroCredit SYSTEM', app_url: process.env.FRONTEND_URL || '' };

      for (const channel of channels) {
        const template = await resolveTemplate(event, channel, institutionId, 'pt');
        if (!template) { logger.warn(`No template for event=${event} channel=${channel}`); continue; }

        warnMissingVariables(template, renderData, event, channel);
        const rendered = renderTemplate(template, renderData);
        // WhatsApp não interpreta HTML — se um template tiver sido editado com marcação HTML
        // (ex.: colado a partir da versão de email), converte para o texto simples formatado
        // que o WhatsApp entende. Os templates por omissão já são texto simples, por isso isto
        // é apenas uma rede de segurança (não altera nada quando não há tags HTML).
        if (channel === 'whatsapp') rendered.body = htmlToWhatsAppText(rendered.body);

        const logEntry = await NotificationLog.create({
          institution_id:   institutionId,
          recipient_id:     clientId,
          recipient_email:  recipientEmail,
          recipient_phone:  recipientPhone,
          channel,
          event,
          template_key:     template.key,
          subject:          rendered.subject,
          body:             rendered.body,
          status:           'queued',
          max_attempts:     3,
          metadata:         { data, ruleId: rule.id },
        });

        const queue = getQueue();
        if (queue) {
          await queue.add('send-notification', { logId: logEntry.id, channel }, {
            delay:   rule.delay_minutes * 60 * 1000,
            attempts: 3,
            backoff:  { type: 'exponential', delay: 30000 },
          });
        } else {
          // No Redis — send immediately (dev fallback)
          try { await sendNotification(logEntry.id); } catch (e) { /* already logged */ }
        }
      }
    }
  } catch (err) {
    logger.error('triggerEvent error', { event, error: err.message });
  }
}

async function resolveTemplate(event, channel, institutionId, lang = 'pt') {
  if (institutionId) {
    const custom = await NotificationTemplate.findOne({
      where: { key: event, channel, language: lang, institution_id: institutionId, is_active: true }
    });
    if (custom) return custom;
  }
  return NotificationTemplate.findOne({
    where: { key: event, channel, language: lang, institution_id: null, is_active: true }
  });
}

// Handlebars deixa {{variavel}} vazio (em vez de falhar) quando a variável não existe nos
// dados — o que produz mensagens com buracos silenciosos ("Olá, !"). Isto não impede o envio
// (o pedido pode ser legítimo mesmo com uma variável opcional em falta), mas regista sempre um
// aviso claro no log da aplicação para que a causa seja fácil de encontrar.
const HANDLEBARS_KEYWORDS = new Set(['this', 'else']);
function warnMissingVariables(template, data, event, channel) {
  const pattern = /\{\{\{?\s*([#/]?)([a-zA-Z_][\w.]*)\s*\}?\}\}/g;
  const missing = new Set();
  for (const text of [template.body, template.subject]) {
    if (!text) continue;
    let match;
    while ((match = pattern.exec(text))) {
      const [, prefix, name] = match;
      if (prefix === '#' || prefix === '/' || HANDLEBARS_KEYWORDS.has(name)) continue;
      const rootKey = name.split('.')[0];
      if (data[rootKey] === undefined || data[rootKey] === null || data[rootKey] === '') missing.add(name);
    }
  }
  if (missing.size > 0) {
    logger.warn('Template com variável(is) sem valor', { event, channel, template: template.key, missing: [...missing] });
  }
}

function renderTemplate(template, data) {
  const compiledBody    = Handlebars.compile(template.body)(data || {});
  const compiledSubject = template.subject ? Handlebars.compile(template.subject)(data || {}) : null;
  return { body: compiledBody, subject: compiledSubject };
}

async function sendNotification(logId) {
  const log = await NotificationLog.findByPk(logId);
  if (!log) throw new Error(`NotificationLog ${logId} not found`);

  await log.update({ status: 'sending', attempts: log.attempts + 1 });

  const provider = PROVIDERS[log.channel];
  if (!provider) throw new Error(`Unknown channel: ${log.channel}`);

  try {
    const result = await provider.send({
      to:           log.channel === 'email' ? log.recipient_email : log.recipient_phone,
      subject:      log.subject,
      body:         log.body,
      institutionId: log.institution_id,
    });

    await log.update({
      status:              'sent',
      provider:            result.provider,
      provider_message_id: result.messageId,
      sent_at:             new Date(),
      error_message:       null,
    });

    logger.info('Notification sent', { channel: log.channel, event: log.event, logId });
  } catch (err) {
    const willRetry = log.attempts < log.max_attempts;
    await log.update({
      status:         willRetry ? 'queued' : 'failed',
      error_message:  err.message,
      next_retry_at:  willRetry ? new Date(Date.now() + 30000 * Math.pow(2, log.attempts)) : null,
    });
    throw err;
  }
}

// Envio de teste REAL — usado pelo botão "🧪 Testar envio": resolve um template concreto
// (por id, ou por evento+canal como qualquer trigger normal), renderiza-o com os dados de
// amostra fornecidos, e envia-o de imediato através do provedor verdadeiro (nunca apenas
// "colocado em fila" — sendNotification() é síncrono e propaga o erro real do provedor se
// falhar). Fica sempre registado em NotificationLog (metadata.manual_test=true) para auditoria,
// tal como qualquer outro envio.
async function testSend({ templateId, event, channel, institutionId, recipient, data = {}, testedBy }) {
  const template = templateId
    ? await NotificationTemplate.findByPk(templateId)
    : await resolveTemplate(event, channel, institutionId, 'pt');
  if (!template) {
    const err = new Error('Template não encontrado para este evento/canal.');
    err.status = 404;
    throw err;
  }

  const institution = template.institution_id ? await Institution.findByPk(template.institution_id) : null;
  const renderData = { ...data, app_name: institution?.name || 'MicroCredit SYSTEM', app_url: process.env.FRONTEND_URL || '' };
  const rendered = renderTemplate(template, renderData);
  if (channel === 'whatsapp') rendered.body = htmlToWhatsAppText(rendered.body);

  const log = await NotificationLog.create({
    institution_id:   template.institution_id || institutionId || null,
    channel,
    event:            template.key,
    template_key:     template.key,
    recipient_email:  channel === 'email' ? recipient : null,
    recipient_phone:  channel !== 'email' ? recipient : null,
    subject:          rendered.subject,
    body:             rendered.body,
    status:           'queued',
    max_attempts:     1,
    metadata:         { manual_test: true, tested_by: testedBy || null },
  });

  try {
    await sendNotification(log.id);
    await log.reload();
    return { success: true, log };
  } catch (err) {
    await log.reload();
    return { success: false, log, error: err.message };
  }
}

async function retryFailed(institutionId) {
  const { Op } = require('sequelize');
  const failed = await NotificationLog.findAll({
    where: {
      status:   'failed',
      attempts: { [Op.lt]: 3 },
      ...(institutionId && { institution_id: institutionId }),
    },
    limit: 50,
  });

  let queued = 0;
  const queue = getQueue();
  for (const log of failed) {
    if (queue) {
      await queue.add('send-notification', { logId: log.id }, { attempts: 1, backoff: { type: 'fixed', delay: 5000 } });
    } else {
      try { await sendNotification(log.id); } catch (e) { /* logged inside */ }
    }
    await log.update({ status: 'queued', next_retry_at: new Date() });
    queued++;
  }
  return queued;
}

async function getStats(institutionId, from, to) {
  const { Op, fn, col } = require('sequelize');
  return NotificationLog.findAll({
    where: {
      ...(institutionId && { institution_id: institutionId }),
      created_at: { [Op.between]: [from, to] },
    },
    attributes: ['channel', 'status', [fn('COUNT', col('id')), 'count']],
    group: ['channel', 'status'],
    raw: true,
  });
}

module.exports = { triggerEvent, sendNotification, testSend, retryFailed, getStats, resolveTemplate, renderTemplate };
