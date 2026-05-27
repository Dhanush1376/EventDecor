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
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  connectTimeout: 10000,
  lazyConnect: true,
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

// Declare core application queues as let (live bindings)
export let emailQueue: Queue;
export let notificationQueue: Queue;
export let loyaltyQueue: Queue;
export let recommendationQueue: Queue;

let queuesInitialized = false;

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
    
    queuesInitialized = true;
    logger.info('🟢 [BULLMQ] Queues initialized successfully');
  } catch (err: any) {
    logger.error(`🔴 [BULLMQ] Failed to initialize queues: ${err.message}`);
    if (requireRedis) {
      throw err;
    } else {
      logger.warn('🟡 [BULLMQ] Continuing without queues due to REQUIRE_REDIS=false');
    }
  }
};

export const isQueuesReady = (): boolean => {
  return queuesInitialized && connection.status === 'ready';
};

export const closeQueues = async () => {
  if (queuesInitialized) {
    if (emailQueue) await emailQueue.close();
    if (notificationQueue) await notificationQueue.close();
    if (loyaltyQueue) await loyaltyQueue.close();
    if (recommendationQueue) await recommendationQueue.close();
  }
  connection.disconnect();
};
