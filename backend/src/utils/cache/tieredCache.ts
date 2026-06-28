import logger from '../../config/logger';
import { redisClient } from './redis';
import { MemoryCache } from './MemoryCache';

export const isRedisReady = (): boolean => {
  return Boolean(redisClient && redisClient.isReady);
};

export async function tieredCacheGet<T>(
  key: string,
  fallbackCache: MemoryCache,
): Promise<T | null> {
  const memCached = fallbackCache.get<T>(key);
  if (memCached !== undefined && memCached !== null) {
    return memCached;
  }

  if (isRedisReady()) {
    try {
      const raw = await redisClient!.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        fallbackCache.set(key, parsed);
        return parsed;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        if (!(global as any).upstashWarningLogged) {
          logger.warn(`[CACHE] Upstash Limit Exceeded. Suppressing further Redis warnings.`);
          (global as any).upstashWarningLogged = true;
        }
      } else {
        logger.warn(`[CACHE] Redis GET failed for ${key}: ${err.message}`);
      }
    }
  }
  return null;
}

export async function tieredCacheSet<T>(
  key: string,
  value: T,
  ttlMs: number,
  fallbackCache: MemoryCache,
): Promise<void> {
  fallbackCache.set(key, value, ttlMs);
  const ttlSeconds = Math.max(Math.round(ttlMs / 1000), 1);

  if (isRedisReady()) {
    try {
      await redisClient!.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err: any) {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        if (!(global as any).upstashWarningLogged) {
          logger.warn(`[CACHE] Upstash Limit Exceeded. Suppressing further Redis warnings.`);
          (global as any).upstashWarningLogged = true;
        }
      } else {
        logger.warn(`[CACHE] Redis SET failed for ${key}: ${err.message}`);
      }
    }
  }
}

export async function tieredCacheDel(key: string, fallbackCache: MemoryCache): Promise<void> {
  fallbackCache.delete(key);

  if (isRedisReady()) {
    try {
      await redisClient!.del(key);
    } catch (err: any) {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        if (!(global as any).upstashWarningLogged) {
          logger.warn(`[CACHE] Upstash Limit Exceeded. Suppressing further Redis warnings.`);
          (global as any).upstashWarningLogged = true;
        }
      } else {
        logger.warn(`[CACHE] Redis DEL failed for ${key}: ${err.message}`);
      }
    }
  }
}
