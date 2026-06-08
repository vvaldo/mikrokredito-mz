// src/queues/index.js
const logger = require('../utils/logger');

let notificationQueue = null;

async function initQueues() {
  try {
    const Bull = require('bull');

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      // Fail fast if Redis not available
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 500, 2000);
      },
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    };

    notificationQueue = new Bull('notifications', { redis: redisConfig });

    // Test connection
    await notificationQueue.client.connect().catch(() => {
      throw new Error('Redis not reachable');
    });

    notificationQueue.on('failed', (job, err) => {
      logger.error('Queue job failed', { jobId: job.id, error: err.message });
    });

    notificationQueue.on('completed', (job) => {
      logger.debug('Queue job completed', { jobId: job.id });
    });

    notificationQueue.process('send-notification',
      parseInt(process.env.QUEUE_CONCURRENCY) || 5,
      async (job) => {
        const { sendNotification } = require('../services/notification/notificationService');
        await sendNotification(job.data.logId);
      }
    );

    logger.info('Bull notification queue ready (Redis connected)');
  } catch (err) {
    logger.warn(`Redis unavailable — notifications will be sent synchronously. (${err.message})`);
    notificationQueue = null;
  }
}

module.exports = {
  initQueues,
  get notificationQueue() { return notificationQueue; },
};
