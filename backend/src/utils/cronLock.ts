import redisClient from './cache/redis';
import logger from '../config/logger';

/**
 * Redis SETNX distributed lock for cron jobs (required when horizontally scaled).
 * Without Redis, runs immediately (single-instance local dev).
 */
export const withCronLock = async (
  lockName: string,
  ttlSeconds: number,
  job: () => Promise<void>,
  expectedIntervalSeconds?: number,
): Promise<void> => {
  const startTime = Date.now();
  let executed = false;

  if (!redisClient || !redisClient.isReady) {
    await job();
    logger.info(`[CRON EXECUTED] "${lockName}" took ${Date.now() - startTime}ms (No Redis)`);
    return;
  }

  const key = `lock:cron:${lockName}`;
  const owner = process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'api';

  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
    throw new Error(`[cronLock] Invalid ttlSeconds: ${ttlSeconds}. Must be a positive integer.`);
  }

  const acquired = await redisClient.set(key, owner, { EX: ttlSeconds, NX: true });
  if (acquired !== 'OK') {
    logger.debug(`[CRON] Skipping "${lockName}" — another instance holds the lock`);
    return;
  }

  try {
    if (expectedIntervalSeconds) {
      const lastRunStr = await redisClient.get(`last_run:${lockName}`);
      if (lastRunStr) {
        const lastRun = parseInt(lastRunStr, 10);
        if (Date.now() - lastRun > expectedIntervalSeconds * 2000) {
          logger.error(
            `[CRON ALERT] Job "${lockName}" missed executions! Gap: ${Math.floor((Date.now() - lastRun) / 1000)}s`,
          );
        }
      }
    }
    await job();
    executed = true;
  } finally {
    if (executed) {
      await redisClient.set(`last_run:${lockName}`, Date.now().toString());
      logger.info(`[CRON EXECUTED] "${lockName}" took ${Date.now() - startTime}ms`);
    }
    await redisClient.del(key).catch(() => {});
  }
};
