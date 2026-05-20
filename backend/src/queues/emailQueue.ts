import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '../config/logger';

// Try to connect to Redis. If Redis is down, we handle the error gracefully to not crash the app.
const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    // Reconnect after 3 seconds, up to 10 times, then stop to prevent memory leak
    if (times > 10) {
      logger.error('Redis connection failed after 10 retries. BullMQ Queue will be disabled.');
      return null;
    }
    return 3000;
  }
};

export const redisConnection = new Redis(redisOptions);

redisConnection.on('error', (err) => {
  logger.error(`[Redis] Connection Error: ${err.message}`);
});

redisConnection.on('ready', () => {
  logger.info('[Redis] Connected successfully for BullMQ');
});

// Create the unified Email & Notification Queue
export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true, // Auto clean up success jobs
    removeOnFail: 1000,     // Keep last 1000 failed jobs for debugging
  }
});
