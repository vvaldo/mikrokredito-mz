// src/queues/index.js
const Bull = require('bull');
const logger = require('../utils/logger');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
};

let notificationQueue;

async function initQueues() {
  notificationQueue = new Bull('notifications', { redis: redisConfig });

  notificationQueue.on('failed', (job, err) => {
    logger.error('Queue job failed', { jobId: job.id, data: job.data, error: err.message });
  });

  notificationQueue.on('completed', (job) => {
    logger.debug('Queue job completed', { jobId: job.id });
  });

  // Process jobs
  notificationQueue.process('send-notification', parseInt(process.env.QUEUE_CONCURRENCY) || 5, async (job) => {
    const { sendNotification } = require('../services/notification/notificationService');
    await sendNotification(job.data.logId);
  });

  logger.info('Bull notification queue ready');
}

function getNotificationQueue() {
  if (!notificationQueue) throw new Error('Queue not initialised. Call initQueues() first.');
  return notificationQueue;
}

module.exports = { initQueues, get notificationQueue() { return getNotificationQueue(); } };
