// src/queues/worker.js — standalone notification worker process
require('dotenv').config();
const { initQueues } = require('./index');
const logger = require('../utils/logger');

async function startWorker() {
  try {
    await initQueues();
    logger.info('Notification worker running — waiting for jobs...');
  } catch (err) {
    logger.error('Worker startup failed', { error: err.message });
    process.exit(1);
  }
}

startWorker();
