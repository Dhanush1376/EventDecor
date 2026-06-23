import redisClient from './redis';
import logger from '../../config/logger';

const REDIS_KEY = 'api:public-cache-version';
const ADMIN_ANALYTICS_KEY = 'api:admin-analytics-cache-version';
let memoryVersion = Date.now().toString();
let adminAnalyticsMemoryVersion = Date.now().toString();

/**
 * Global version token for public GET cache busting.
 * Bumped when products, CMS, gallery, or events are mutated.
 */
export async function getPublicCacheVersion(): Promise<string> {
  if (redisClient && redisClient.isReady) {
    try {
      const remote = await redisClient.get(REDIS_KEY);
      if (remote) return remote;
    } catch (err) {
      logger.warn('[CACHE] Failed to read cache version from Redis, using memory fallback', err);
    }
  }
  return memoryVersion;
}

export async function bumpPublicCacheVersion(): Promise<void> {
  const next = Date.now().toString();
  memoryVersion = next;

  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.set(REDIS_KEY, next);
    } catch (err) {
      logger.warn('[CACHE] Failed to persist cache version to Redis', err);
    }
  }

  logger.info(`[CACHE] Public API cache version bumped to ${next}`);
  await bumpAdminAnalyticsCacheVersion({ quiet: true });
}

export async function getAdminAnalyticsCacheVersion(): Promise<string> {
  if (redisClient && redisClient.isReady) {
    try {
      const remote = await redisClient.get(ADMIN_ANALYTICS_KEY);
      if (remote) return remote;
    } catch (err) {
      logger.warn('[CACHE] Failed to read admin analytics cache version from Redis', err);
    }
  }
  return adminAnalyticsMemoryVersion;
}

/** Bust admin dashboard/analytics Redis cache after orders, products, or CMS mutations. */
export async function bumpAdminAnalyticsCacheVersion(options?: { quiet?: boolean }): Promise<void> {
  const next = Date.now().toString();
  adminAnalyticsMemoryVersion = next;

  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.set(ADMIN_ANALYTICS_KEY, next);
    } catch (err) {
      logger.warn('[CACHE] Failed to persist admin analytics cache version to Redis', err);
    }
  }

  if (!options?.quiet) {
    logger.info(`[CACHE] Admin analytics cache version bumped to ${next}`);
  }
}
