import Redis from 'ioredis';
import * as Sentry from '@sentry/node';
import logger from '../config/logger';

const redisUrl = process.env.REDIS_URL;

let redisClient: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

const reportRedisDisconnect = (err: Error) => {
  logger.error('Redis Client Error:', err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: { subsystem: 'redis' },
      level: 'error',
    });
  }
};

if (redisUrl) {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  pubClient = redisClient.duplicate();
  subClient = redisClient.duplicate();

  redisClient.on('error', reportRedisDisconnect);
  redisClient.on('connect', () => logger.info('✅ Redis Client Connected'));
  redisClient.on('close', () => {
    logger.error('[REDIS] Connection closed');
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage('Redis connection closed', {
        tags: { subsystem: 'redis' },
        level: 'warning',
      });
    }
  });
} else {
  logger.warn('⚠️ REDIS_URL not provided. Running without Redis (Not recommended for multi-instance production).');
}

export const pingRedis = async (): Promise<'up' | 'down' | 'not_configured'> => {
  if (!redisClient) return 'not_configured';
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  }
};

export { redisClient, pubClient, subClient };
export default redisClient;
