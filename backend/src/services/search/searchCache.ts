import { MemoryCache } from '../../utils/MemoryCache';
import logger from '../../config/logger';
import redisClient from '../../utils/redis';

// ── In-memory caches ──
export const autocompleteCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000, maxKeys: 500 });
export const trendingSearchCache = new MemoryCache({ defaultTtlMs: 15 * 60 * 1000, maxKeys: 10 });
export const searchResultsCache = new MemoryCache({ defaultTtlMs: 3 * 60 * 1000, maxKeys: 200 });

// ── Redis Cache Helper ──
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    if (redisClient && redisClient.isReady) {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data) as T;
    }
  } catch (err: any) {
    logger.warn(`[SEARCH CACHE] Redis get error for key ${key}: ${err.message}`);
  }
  return null;
}

export async function setCachedData<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    if (redisClient && redisClient.isReady) {
      const ttlSecs = Math.max(Math.round(ttlMs / 1000), 1);
      await redisClient.set(key, JSON.stringify(data), { EX: ttlSecs });
    }
  } catch (err: any) {
    logger.warn(`[SEARCH CACHE] Redis set error for key ${key}: ${err.message}`);
  }
}

export async function getSearchCache<T>(
  cacheType: 'ac' | 'trending' | 'full',
  key: string,
): Promise<T | null> {
  const redisKey = `search:${cacheType}:${key}`;
  const redisCached = await getCachedData<T>(redisKey);
  if (redisCached) return redisCached;

  if (cacheType === 'ac') return autocompleteCache.get<T>(key);
  if (cacheType === 'trending') return trendingSearchCache.get<T>(key);
  return searchResultsCache.get<T>(key);
}

export async function setSearchCache<T>(
  cacheType: 'ac' | 'trending' | 'full',
  key: string,
  val: T,
  ttlMs: number,
): Promise<void> {
  const redisKey = `search:${cacheType}:${key}`;
  await setCachedData(redisKey, val, ttlMs);

  if (cacheType === 'ac') autocompleteCache.set(key, val, ttlMs);
  else if (cacheType === 'trending') trendingSearchCache.set(key, val, ttlMs);
  else searchResultsCache.set(key, val, ttlMs);
}
