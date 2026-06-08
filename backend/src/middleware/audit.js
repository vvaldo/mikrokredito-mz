// src/middleware/audit.js
const { AuditLog } = require('../models');
const logger = require('../utils/logger');

function audit(action) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      if (res.statusCode < 400 && req.user) {
        try {
          await AuditLog.create({
            institution_id: req.user.institution_id,
            user_id: req.user.id,
            user_name: req.user.full_name,
            user_role: req.user.role,
            action,
            entity: req.baseUrl.split('/').pop(),
            entity_id: req.params.id || body?.data?.id,
            new_values: req.body,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            description: `${req.user.full_name} [${req.user.role}] — ${action}`,
          });
        } catch (err) {
          logger.error('Audit log failed', { error: err.message });
        }
      }
      originalJson(body);
    };

    next();
  };
}

module.exports = { audit };
