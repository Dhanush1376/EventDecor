import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../config/logger';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Configure IORedis for BullMQ (reusing the same Redis server)
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io') ? { rejectUnauthorized: process.env.REDIS_REJECT_UNAUTHORIZED !== 'false' } : undefined
});

connection.on('error', (err: any) => {
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
    logger.warn(`[BULLMQ IOREDIS] Transient connection issue (${err.code}). Will retry.`);
  } else {
    logger.error(`[BULLMQ IOREDIS] Connection Error: ${err.message}`);
  }
});

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// Define core application queues
export const emailQueue = new Queue('emailQueue', defaultQueueOptions);
export const notificationQueue = new Queue('notificationQueue', defaultQueueOptions);
export const loyaltyQueue = new Queue('loyaltyQueue', defaultQueueOptions);

export const closeQueues = async () => {
  await emailQueue.close();
  await notificationQueue.close();
  await loyaltyQueue.close();
  connection.disconnect();
};
