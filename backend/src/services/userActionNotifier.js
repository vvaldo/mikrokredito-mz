const { NotificationLog, AuditLog, User } = require('../models');
const emailProvider = require('./notification/providers/emailProvider');
const logger = require('../utils/logger');

function stripHtml(html){ return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

async function notifyAffectedUser({ user, userId, actor, institutionId, action, subject, body, metadata = {}, linkPath = null }) {
  try {
    const target = user || (userId ? await User.findByPk(userId) : null);
    if (!target) return null;
    const finalSubject = subject || 'Alerta de actividade na sua conta - MicroCredit SYSTEM';
    const finalBody = body || `<p>Prezado(a) ${target.full_name},</p><p>Foi registada uma actividade na sua conta: <strong>${action}</strong>.</p>`;
    const log = await NotificationLog.create({
      institution_id: institutionId || target.institution_id || actor?.institution_id || null,
      recipient_id: target.id,
      recipient_email: target.email,
      recipient_phone: target.phone,
      channel: 'email',
      event: action || 'user_action_alert',
      subject: finalSubject,
      body: finalBody,
      status: 'sending',
      attempts: 1,
      max_attempts: 3,
      link_path: linkPath,
      metadata: { ...metadata, actor: actor ? { id: actor.id, email: actor.email, role: actor.role, name: actor.full_name } : null },
    });

    try {
      const info = await emailProvider.send({ to: target.email, subject: finalSubject, body: finalBody, institutionId: institutionId || target.institution_id || actor?.institution_id });
      await log.update({ status: 'sent', provider: info.provider, provider_message_id: info.messageId, sent_at: new Date(), error_message: null });
    } catch (err) {
      await log.update({ status: 'failed', error_message: err.message });
      logger.warn('User action email failed', { userId: target.id, action, error: err.message });
    }

    await AuditLog.create({
      institution_id: institutionId || target.institution_id || actor?.institution_id || null,
      user_id: actor?.id || null,
      user_name: actor?.full_name || 'Sistema',
      user_role: actor?.role || 'system',
      action: `${action || 'user_action'}_notification`,
      entity: 'NotificationLog',
      entity_id: log.id,
      new_values: { target_user_id: target.id, target_email: target.email, subject: finalSubject, body: stripHtml(finalBody), status: log.status },
      description: `Alerta por email para ${target.email}: ${action}`,
    });
    return log;
  } catch (err) {
    logger.error('notifyAffectedUser failed', { error: err.message, action });
    return null;
  }
}

module.exports = { notifyAffectedUser };
