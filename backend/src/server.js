// src/server.js
require('dotenv').config();
const app = require('./app');
const { sequelize, PlatformSetting } = require('./models');
const { initQueues } = require('./queues');
const whatsappClient = require('./services/whatsapp/whatsappClient');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

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
    }

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
