import redisClient from './redis';
import logger from '../config/logger';

/**
 * Redis SETNX distributed lock for cron jobs (required when horizontally scaled).
 * Without Redis, runs immediately (single-instance local dev).
 */
export const withCronLock = async (
  lockName: string,
  ttlSeconds: number,
  job: () => Promise<void>
): Promise<void> => {
  if (!redisClient) {
    await job();
    return;
  }

  const key = `lock:cron:${lockName}`;
  const owner = process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'api';

  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new Error(`[cronLock] Invalid ttlSeconds: ${ttlSeconds}. Must be a positive integer.`);
  }

  const acquired = await redisClient.set(key, owner, 'EX', ttlSeconds, 'NX');
  if (acquired !== 'OK') {
    logger.debug(`[CRON] Skipping "${lockName}" — another instance holds the lock`);
    return;
  }

  try {
    await job();
  } finally {
    await redisClient.del(key).catch(() => {});
  }
};
