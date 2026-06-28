import { MemoryCache } from '../../utils/cache/MemoryCache';

// ── In-memory caches ──
export const autocompleteCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000, maxKeys: 500 });
export const trendingSearchCache = new MemoryCache({ defaultTtlMs: 15 * 60 * 1000, maxKeys: 10 });
export const searchResultsCache = new MemoryCache({ defaultTtlMs: 3 * 60 * 1000, maxKeys: 200 });

import { tieredCacheGet, tieredCacheSet } from '../../utils/cache/tieredCache';

export async function getSearchCache<T>(
  cacheType: 'ac' | 'trending' | 'full',
  key: string,
): Promise<T | null> {
  const redisKey = `search:${cacheType}:${key}`;
  let fallbackCache;
  if (cacheType === 'ac') fallbackCache = autocompleteCache;
  else if (cacheType === 'trending') fallbackCache = trendingSearchCache;
  else fallbackCache = searchResultsCache;

  return tieredCacheGet<T>(redisKey, fallbackCache);
}

export async function setSearchCache<T>(
  cacheType: 'ac' | 'trending' | 'full',
  key: string,
  val: T,
  ttlMs: number,
): Promise<void> {
  const redisKey = `search:${cacheType}:${key}`;
  let fallbackCache;
  if (cacheType === 'ac') fallbackCache = autocompleteCache;
  else if (cacheType === 'trending') fallbackCache = trendingSearchCache;
  else fallbackCache = searchResultsCache;

  return tieredCacheSet(redisKey, val, ttlMs, fallbackCache);
}
