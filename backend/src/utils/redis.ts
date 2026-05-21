import Redis from 'ioredis';
import logger from '../config/logger';

const redisUrl = process.env.REDIS_URL;

let redisClient: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

if (redisUrl) {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  pubClient = redisClient.duplicate();
  subClient = redisClient.duplicate();

  redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
  redisClient.on('connect', () => logger.info('✅ Redis Client Connected'));
} else {
  logger.warn('⚠️ REDIS_URL not provided. Running without Redis (Not recommended for multi-instance production).');
}

export { redisClient, pubClient, subClient };
export default redisClient;
