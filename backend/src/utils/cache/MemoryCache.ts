import logger from '../../config/logger';
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
  private readonly name: string;
  private pendingPromises = new Map<string, Promise<any>>();

  // Global entry tracking across all instances
  private static totalEntries = 0;
  private static instanceCount = 0;
  private static readonly MAX_ENTRY_SIZE_BYTES = 512 * 1024; // 512KB per entry max

  constructor(
    options: {
      defaultTtlMs?: number;
      maxKeys?: number;
      cleanupIntervalMs?: number;
      name?: string;
    } = {},
  ) {
    this.defaultTtlMs = options.defaultTtlMs || 5 * 60 * 1000; // default 5 minutes
    this.maxKeys = options.maxKeys || 200; // Reduced from 1000 to prevent OOM
    this.name = options.name || `cache_${MemoryCache.instanceCount}`;
    MemoryCache.instanceCount++;

    // Periodically sweep expired entries to prevent memory leaks
    const interval = options.cleanupIntervalMs || 60 * 1000; // default 1 minute
    this.cleanupInterval = (globalThis as any).setInterval(() => this.sweep(), interval);

    // Avoid blocking node process termination in tests or script executions
    if (this.cleanupInterval && this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    // Rough entry size estimation to prevent caching very large objects
    const estimatedSize = this.estimateSize(value);
    if (estimatedSize > MemoryCache.MAX_ENTRY_SIZE_BYTES) {
      logger.warn(
        `[MemoryCache:${this.name}] Rejected oversized entry (${Math.round(estimatedSize / 1024)}KB) for key: ${key.substring(0, 50)}`,
      );
      return;
    }

    if (this.cache.size >= this.maxKeys) {
      // Simple LRU eviction: delete the oldest entry by key iteration
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        MemoryCache.totalEntries--;
      }
    }

    const isNew = !this.cache.has(key);
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
    if (isNew) MemoryCache.totalEntries++;

    // Log cache pressure when instance is at >90% capacity
    if (this.cache.size > this.maxKeys * 0.9 && this.cache.size % 50 === 0) {
      logger.warn(
        `[MemoryCache:${this.name}] Cache pressure: ${this.cache.size}/${this.maxKeys} entries (global: ${MemoryCache.totalEntries})`,
      );
    }
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
    const existed = this.cache.delete(key);
    if (existed) MemoryCache.totalEntries--;
    return existed;
  }

  clear(): void {
    MemoryCache.totalEntries -= this.cache.size;
    this.cache.clear();
  }

  private sweep(): void {
    const now = Date.now();
    let swept = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        MemoryCache.totalEntries--;
        swept++;
      }
    }
    if (swept > 0) {
      logger.debug(
        `[MemoryCache:${this.name} Sweep] Purged ${swept} expired items. (instance: ${this.cache.size}, global: ${MemoryCache.totalEntries})`,
      );
    }
  }

  /** Rough byte-size estimation for a value. */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number' || typeof value === 'boolean') return 8;
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return MemoryCache.MAX_ENTRY_SIZE_BYTES + 1; // Reject non-serializable
    }
  }

  /** Get total entries across all MemoryCache instances. */
  static getTotalEntries(): number {
    return MemoryCache.totalEntries;
  }

  /** Get instance entry count. */
  get size(): number {
    return this.cache.size;
  }

  // Thread-safe wrapper to get or fetch from fallback
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache stampede prevention
    if (this.pendingPromises.has(key)) {
      return this.pendingPromises.get(key) as Promise<T>;
    }

    const promise = fetchFn()
      .then((fresh) => {
        this.set(key, fresh, ttlMs);
        this.pendingPromises.delete(key);
        return fresh;
      })
      .catch((err) => {
        this.pendingPromises.delete(key);
        throw err;
      });

    this.pendingPromises.set(key, promise);
    return promise;
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
          cacheName === 'categoryCache'
            ? categoryCache
            : cacheName === 'cmsCache'
              ? cmsCache
              : cacheName === 'featuredProductCache'
                ? featuredProductCache
                : cacheName === 'safetyLockCache'
                  ? safetyLockCache
                  : cacheName === 'analyticsCache'
                    ? analyticsCache
                    : null;

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
    pubClient
      .publish('cache:invalidate', JSON.stringify({ cacheName, action: 'clear' }))
      .catch(() => {});
  }
};

export const broadcastCacheDelete = (cacheName: string, key: string) => {
  if (pubClient) {
    pubClient
      .publish('cache:invalidate', JSON.stringify({ cacheName, action: 'delete', key }))
      .catch(() => {});
  }
};
