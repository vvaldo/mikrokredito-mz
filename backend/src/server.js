// src/server.js
require('dotenv').config();
const app = require('./app');
const { sequelize, PlatformSetting, PaymentAllocation } = require('./models');
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
    // Novo evento de notificação: início dos juros de mora (fim do período de tolerância).
    // ADD VALUE IF NOT EXISTS é seguro correr em todos os arranques (Postgres 12+).
    `ALTER TYPE "enum_notification_rules_event" ADD VALUE IF NOT EXISTS 'late_fee_started'`,
  ];
  for (const sql of statements) {
    try { await sequelize.query(sql); }
    catch (err) {
      // Uma falha isolada (ex.: nome do tipo ENUM diferente do esperado numa instalação mais
      // antiga) não pode impedir as restantes patches nem abortar o arranque do servidor.
      logger.warn('Schema patch falhou (não bloqueante)', { sql, error: err.message });
    }
  }
  // Tabela nova (payment_allocations) — .sync() só cria se ainda não existir, nunca altera
  // tabelas já criadas, tal como platform_settings acima.
  await PaymentAllocation.sync();
}

// Templates/regras de notificação por omissão nunca deviam ficar vazios (não são "dados de
// demonstração" — são configuração base do sistema). seedNotificationDefaults() agora só
// insere o que realmente falta, linha a linha (ver ensureTemplate/ensureRule em seed.js) — por
// isso é seguro correr em TODOS os arranques, em qualquer ambiente: nunca sobrescreve um
// template já existente (mesmo que um gestor o tenha customizado), só preenche o que falta —
// incluindo canais/eventos novos adicionados numa actualização, que antes só chegavam a uma
// base de dados completamente vazia.
async function ensureDefaultNotificationTemplates() {
  const { seedNotificationDefaults } = require('./models/seed');
  await seedNotificationDefaults();
  logger.info('Templates/regras de notificação por omissão verificados.');
}

// Job diário (lembretes de vencimento, prestação vencida, início de juros de mora — ver
// jobs/loanDeadlineJob.js). Implementado com setInterval em vez de um job repetível do Bull
// porque a disponibilidade do Redis em produção não é garantida (ver initQueues, que já
// degrada de forma resiliente na ausência de Redis) — isto corre sempre, independentemente do
// Redis estar ou não configurado. Idempotente (dedupeKey por evento/prestação/marco), por isso
// é seguro correr mais de uma vez por dia (ex.: depois de um restart) sem duplicar envios.
function scheduleLoanDeadlineJob() {
  const { runLoanDeadlineJob } = require('./jobs/loanDeadlineJob');
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const run = () => runLoanDeadlineJob().catch(err => logger.error('loanDeadlineJob falhou', { error: err.message }));
  setTimeout(run, 60 * 1000); // primeira corrida ~1 min depois do arranque
  setInterval(run, ONE_DAY_MS);
  logger.info('loanDeadlineJob agendado (a cada 24h, a partir de ~1 min depois do arranque)');
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

    scheduleLoanDeadlineJob();

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
