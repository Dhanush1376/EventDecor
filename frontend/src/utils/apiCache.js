/**
 * In-memory GET response cache with TTL and stale-while-revalidate support.
 * Safe for public read-only endpoints; never caches authenticated mutations.
 */

const cache = new Map();

const DEFAULT_TTL_MS = 60 * 1000;

/** Path-prefix → TTL (ms). Longer TTL for rarely-changing public data. */
const TTL_BY_PREFIX = [
  ['/cms', 5 * 60 * 1000],
  ['/products/categories', 10 * 60 * 1000],
  ['/products', 2 * 60 * 1000],
  ['/gallery/categories', 10 * 60 * 1000],
  ['/gallery', 5 * 60 * 1000],
  ['/events', 2 * 60 * 1000],
  ['/showcase', 5 * 60 * 1000],
  ['/recommendations', 3 * 60 * 1000],
  ['/search', 1 * 60 * 1000],
];

const MAX_CACHE_ENTRIES = 100;

const NO_CACHE_PATHS = [
  '/auth/profile',
  '/auth/refresh',
  '/csrf-token',
  '/users/cart',
  '/users/wishlist',
  '/orders',
  '/notifications',
  '/health',
  '/admin',
];

const resolveTtl = (url = '') => {
  const path = url.split('?')[0];
  for (const prefix of NO_CACHE_PATHS) {
    if (path.includes(prefix)) return 0;
  }
  for (const [prefix, ttl] of TTL_BY_PREFIX) {
    if (path.includes(prefix)) return ttl;
  }
  return DEFAULT_TTL_MS;
};

const buildKey = (url, config) => `${url}?${JSON.stringify(config?.params || {})}`;

export const getCachedGet = (url, config) => {
  const ttl = resolveTtl(url);
  if (!ttl) return null;

  const key = buildKey(url, config);
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.storedAt;
  if (age > ttl * 2) {
    cache.delete(key);
    return null;
  }

  return {
    data: entry.data,
    stale: age > ttl,
    key,
  };
};

export const setCachedGet = (url, config, data) => {
  const ttl = resolveTtl(url);
  if (!ttl || data === undefined) return;

  const key = buildKey(url, config);

  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    // Evict oldest entry (Map iterates in insertion order)
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  // Re-insert to update insertion order for LRU
  if (cache.has(key)) {
    cache.delete(key);
  }

  cache.set(key, { data, storedAt: Date.now() });
};

export const invalidateApiCache = (urlPrefix) => {
  if (!urlPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
};

export const clearApiCache = () => cache.clear();
