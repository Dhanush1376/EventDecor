import logger from '../config/logger';
import { pubClient, subClient } from './redis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: any = null;
  private maxKeys: number;
  private defaultTtlMs: number;

  constructor(options: { defaultTtlMs?: number; maxKeys?: number; cleanupIntervalMs?: number } = {}) {
    this.defaultTtlMs = options.defaultTtlMs || 5 * 60 * 1000; // default 5 minutes
    this.maxKeys = options.maxKeys || 1000;
    
    // Periodically sweep expired entries to prevent memory leaks
    const interval = options.cleanupIntervalMs || 60 * 1000; // default 1 minute
    this.cleanupInterval = (globalThis as any).setInterval(() => this.sweep(), interval);
    
    // Avoid blocking node process termination in tests or script executions
    if (this.cleanupInterval && this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxKeys) {
      // Simple LRU eviction: delete the oldest entry by key iteration
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Re-insert to move to end (LRU promotion)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private sweep(): void {
    const now = Date.now();
    let swept = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        swept++;
      }
    }
    if (swept > 0) {
      logger.debug(`[MemoryCache Sweep] Purged ${swept} expired items.`);
    }
  }

  // Thread-safe wrapper to get or fetch from fallback
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetchFn();
    this.set(key, fresh, ttlMs);
    return fresh;
  }
}

// Pre-configured shared application caches
export const categoryCache = new MemoryCache({ defaultTtlMs: 15 * 60 * 1000 }); // 15 minutes
export const cmsCache = new MemoryCache({ defaultTtlMs: 10 * 60 * 1000 }); // 10 minutes
export const featuredProductCache = new MemoryCache({ defaultTtlMs: 3 * 60 * 1000 }); // 3 minutes
export const safetyLockCache = new MemoryCache({ defaultTtlMs: 30 * 1000 }); // 30 seconds
export const analyticsCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000 }); // 5 minutes

// Multi-instance cache invalidation subscriber
if (subClient) {
  subClient.subscribe('cache:invalidate', (err) => {
    if (err) logger.error('Failed to subscribe to cache:invalidate channel:', err);
  });
  subClient.on('message', (channel, message) => {
    if (channel === 'cache:invalidate') {
      try {
        const { cacheName, key, action } = JSON.parse(message);
        const targetCache = 
          cacheName === 'categoryCache' ? categoryCache :
          cacheName === 'cmsCache' ? cmsCache :
          cacheName === 'featuredProductCache' ? featuredProductCache :
          cacheName === 'safetyLockCache' ? safetyLockCache : 
          cacheName === 'analyticsCache' ? analyticsCache : null;

        if (targetCache) {
          if (action === 'clear') {
            targetCache.clear();
            logger.debug(`[Redis PubSub] Cleared ${cacheName} across cluster.`);
          } else if (action === 'delete' && key) {
            targetCache.delete(key);
            logger.debug(`[Redis PubSub] Deleted ${key} from ${cacheName} across cluster.`);
          }
        }
      } catch (e) {
        logger.error('Error processing cache invalidation message:', e);
      }
    }
  });
}

// Global broadcast helpers
export const broadcastCacheClear = (cacheName: string) => {
  if (pubClient) {
    pubClient.publish('cache:invalidate', JSON.stringify({ cacheName, action: 'clear' })).catch(() => {});
  }
};

export const broadcastCacheDelete = (cacheName: string, key: string) => {
  if (pubClient) {
    pubClient.publish('cache:invalidate', JSON.stringify({ cacheName, action: 'delete', key })).catch(() => {});
  }
};
