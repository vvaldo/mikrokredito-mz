// src/server.js
require('dotenv').config();
const app = require('./app');
const { sequelize, PlatformSetting, PaymentAllocation, NotificationTemplate } = require('./models');
const { initQueues } = require('./queues');
const whatsappClient = require('./services/whatsapp/whatsappClient');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Colunas novas e aditivas (nunca alteram/apagam dados existentes) que precisam de existir
// mesmo em produção, onde sequelize.sync({alter:true}) é deliberadamente desligado. Usa
// ADD COLUMN IF NOT EXISTS para ser seguro correr em todos os arranques, em qualquer ambiente.
async function ensureSchemaPatches() {
  const statements = [
    `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15,2)`,
    `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS edited_by UUID`,
    `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS cancelled_by UUID`,
    `ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS cancel_reason TEXT`,
    `ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS late_fee_accrued_through TIMESTAMP WITH TIME ZONE`,
  ];
  for (const sql of statements) await sequelize.query(sql);
  // Tabela nova (payment_allocations) — .sync() só cria se ainda não existir, nunca altera
  // tabelas já criadas, tal como platform_settings acima.
  await PaymentAllocation.sync();
}

// Templates/regras de notificação por omissão nunca deviam ficar vazios (não são "dados de
// demonstração" — são configuração base do sistema). Corre em TODOS os arranques, em
// qualquer ambiente, mas só insere quando a tabela está mesmo vazia — idempotente e seguro
// mesmo que um `clean --minimal` (que apaga tudo) tenha corrido sem o operador saber que
// isto precisava de ser reposto manualmente.
async function ensureDefaultNotificationTemplates() {
  const count = await NotificationTemplate.count();
  if (count > 0) return;
  const { seedNotificationDefaults } = require('./models/seed');
  await seedNotificationDefaults();
  logger.info('Templates de notificação por omissão criados (tabela estava vazia).');
}

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected');

    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Models synchronised');
    } else {
      // Garante que tabelas novas (ex.: platform_settings) existem também em produção,
      // sem tocar no schema de tabelas já existentes.
      await PlatformSetting.sync();
      await ensureSchemaPatches();
    }
    await ensureDefaultNotificationTemplates();

    await initQueues();
    logger.info('Queues initialised');

    // Não bloqueia o arranque: só reconecta se já existir uma sessão WhatsApp gravada.
    whatsappClient.autoInitIfSessionExists().catch(err => logger.warn('WhatsApp auto-init falhou', { error: err.message }));

    app.listen(PORT, () => {
      logger.info(`MicroCredit SYSTEM API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

start();
