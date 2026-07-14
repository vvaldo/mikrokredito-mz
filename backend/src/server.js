// src/server.js
require('dotenv').config();
const app = require('./app');
const { sequelize, PlatformSetting } = require('./models');
const { initQueues } = require('./queues');
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

    app.listen(PORT, () => {
      logger.info(`MicroCredit SYSTEM API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

start();
