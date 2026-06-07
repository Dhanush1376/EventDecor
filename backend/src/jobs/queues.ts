import '../config/loadEnv';
import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../config/logger';
import { requestContextStorage } from '../middleware/requestTracker';

const originalAdd = Queue.prototype.add;
Queue.prototype.add = function (name: string, data: any, opts?: any) {
  const ctx = requestContextStorage.getStore();
  if (ctx && data && typeof data === 'object') {
    data = { ...data, _trace: { requestId: ctx.requestId, userId: ctx.userId } };
  }
  return originalAdd.call(this, name, data, opts);
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Configure IORedis for BullMQ (reusing the same Redis server)
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 10000,
  lazyConnect: true,
  tls:
    redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io')
      ? { rejectUnauthorized: process.env.REDIS_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  retryStrategy: (retries: number) => {
    const requireRedis = process.env.REQUIRE_REDIS === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    if (!requireRedis && !isProduction && retries > 5) {
      return null; // Stop reconnecting after 5 attempts if not required
    }
    return Math.min(retries * 100, 3000);
  },
});

export const switchToFallbackQueues = () => {
  if (usingFallback) return;
  logger.warn(
    '⚠️ [BULLMQ] Dynamic fallback triggered! Re-routing all queues to MongoDB/in-memory fallback.',
  );

  const { QueueFallbackService } = require('../services/QueueFallbackService');
  emailQueue = QueueFallbackService.getQueue('emailQueue');
  notificationQueue = QueueFallbackService.getQueue('notificationQueue');
  loyaltyQueue = QueueFallbackService.getQueue('loyaltyQueue');
  recommendationQueue = QueueFallbackService.getQueue('recommendationQueue');
  webhookQueue = QueueFallbackService.getQueue('webhookQueue');
  refundQueue = QueueFallbackService.getQueue('refundQueue');
  systemQueue = QueueFallbackService.getQueue('systemQueue');
  deadLetterQueue = QueueFallbackService.getQueue('deadLetterQueue');

  usingFallback = true;
};

connection.on('error', (err: any) => {
  if (err.message && err.message.includes('max requests limit exceeded')) {
    if (!(global as any).upstashBullMqDisconnectLogged) {
      logger.error(
        `[BULLMQ IOREDIS] Upstash Free Limit Exceeded. Gracefully disconnecting to prevent reconnect loops.`,
      );
      (global as any).upstashBullMqDisconnectLogged = true;
    }
    // Disconnect immediately to stop the infinite auto-reconnect cycle
    connection.disconnect();

    // Switch to fallback queues dynamically
    switchToFallbackQueues();

    // Gracefully shut down workers to prevent reconnection closed logs
    try {
      const { closeWorkers } = require('./workers');
      closeWorkers().catch(() => {});
    } catch {}
  } else if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
    logger.warn(`[BULLMQ IOREDIS] Transient connection issue (${err.code}). Will retry.`);
  } else if (
    err.code === 'ECONNREFUSED' &&
    !process.env.REDIS_URL &&
    process.env.REQUIRE_REDIS !== 'true'
  ) {
    // Suppress connection refused logs in local dev when Redis is omitted
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
    removeOnFail: { count: 1000 },
  },
};

export let emailQueue: Queue;
export let notificationQueue: Queue;
export let loyaltyQueue: Queue;
export let recommendationQueue: Queue;
export let webhookQueue: Queue;
export let refundQueue: Queue;
export let systemQueue: Queue;
export let deadLetterQueue: Queue;

let queuesInitialized = false;
export let usingFallback = false;

export const initQueues = async () => {
  if (queuesInitialized) return;

  const requireRedis = process.env.REQUIRE_REDIS === 'true';
  try {
    logger.info('🔄 [BULLMQ] Connecting and initializing queues...');

    // Explicitly trigger connection since lazyConnect: true is set
    await connection.connect();

    emailQueue = new Queue('emailQueue', defaultQueueOptions);
    notificationQueue = new Queue('notificationQueue', defaultQueueOptions);
    loyaltyQueue = new Queue('loyaltyQueue', defaultQueueOptions);
    recommendationQueue = new Queue('recommendationQueue', defaultQueueOptions);
    webhookQueue = new Queue('webhookQueue', defaultQueueOptions);
    refundQueue = new Queue('refundQueue', defaultQueueOptions);
    systemQueue = new Queue('systemQueue', defaultQueueOptions);
    deadLetterQueue = new Queue('deadLetterQueue', defaultQueueOptions);

    queuesInitialized = true;
    logger.info('🟢 [BULLMQ] Queues initialized successfully');
  } catch (err: any) {
    logger.error(`🔴 [BULLMQ] Failed to initialize queues: ${err.message}`);
    if (requireRedis) {
      throw err;
    } else {
      logger.warn(
        '🟡 [BULLMQ] Continuing with fallback in-memory queues due to REQUIRE_REDIS=false',
      );

      const { QueueFallbackService } = require('../services/QueueFallbackService');

      emailQueue = QueueFallbackService.getQueue('emailQueue');
      notificationQueue = QueueFallbackService.getQueue('notificationQueue');
      loyaltyQueue = QueueFallbackService.getQueue('loyaltyQueue');
      recommendationQueue = QueueFallbackService.getQueue('recommendationQueue');
      webhookQueue = QueueFallbackService.getQueue('webhookQueue');
      refundQueue = QueueFallbackService.getQueue('refundQueue');
      systemQueue = QueueFallbackService.getQueue('systemQueue');
      deadLetterQueue = QueueFallbackService.getQueue('deadLetterQueue');

      usingFallback = true;
      queuesInitialized = true;
    }
  }
};

export const isQueuesReady = (): boolean => {
  return queuesInitialized && (connection.status === 'ready' || usingFallback);
};

export const closeQueues = async () => {
  if (queuesInitialized) {
    if (emailQueue) await emailQueue.close();
    if (notificationQueue) await notificationQueue.close();
    if (loyaltyQueue) await loyaltyQueue.close();
    if (recommendationQueue) await recommendationQueue.close();
    if (webhookQueue) await webhookQueue.close();
    if (refundQueue) await refundQueue.close();
    if (systemQueue) await systemQueue.close();
    if (deadLetterQueue) await deadLetterQueue.close();
  }
  connection.disconnect();
};
