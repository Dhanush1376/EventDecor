import redisClient from './redis';
import logger from '../config/logger';

const REDIS_KEY = 'api:public-cache-version';
let memoryVersion = Date.now().toString();

/**
 * Global version token for public GET cache busting.
 * Bumped when products, CMS, gallery, or events are mutated.
 */
export async function getPublicCacheVersion(): Promise<string> {
  if (redisClient) {
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

  if (redisClient) {
    try {
      await redisClient.set(REDIS_KEY, next);
    } catch (err) {
      logger.warn('[CACHE] Failed to persist cache version to Redis', err);
    }
  }

  logger.info(`[CACHE] Public API cache version bumped to ${next}`);
}
