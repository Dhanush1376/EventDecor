import logger from '../../config/logger';
import { redisClient } from '../../utils/redis';
import { MemoryCache } from '../../utils/MemoryCache';

// In-memory fallback caches when Redis is unavailable
const personalFeedCache = new MemoryCache({ defaultTtlMs: 10 * 60 * 1000, maxKeys: 500 });
const trendingCache = new MemoryCache({ defaultTtlMs: 15 * 60 * 1000, maxKeys: 50 });
const similarCache = new MemoryCache({ defaultTtlMs: 30 * 60 * 1000, maxKeys: 200 });
const seasonalCache = new MemoryCache({ defaultTtlMs: 60 * 60 * 1000, maxKeys: 10 });
const sessionCache = new MemoryCache({ defaultTtlMs: 30 * 60 * 1000, maxKeys: 1000 });
const coldStartCache = new MemoryCache({ defaultTtlMs: 15 * 60 * 1000, maxKeys: 10 });
const ctrCache = new MemoryCache({ defaultTtlMs: 24 * 60 * 60 * 1000, maxKeys: 30 });

const isRedisReady = (): boolean => {
  return Boolean(redisClient && redisClient.isReady);
};

/**
 * Unified cache get — tries MemoryCache first (L1 Cache), then Redis.
 */
async function cacheGet<T>(key: string, fallbackCache: MemoryCache): Promise<T | null> {
  // L1 Cache check
  const memCached = fallbackCache.get<T>(key);
  if (memCached !== undefined && memCached !== null) {
    return memCached;
  }

  if (isRedisReady()) {
    try {
      const raw = await redisClient!.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        // Populate L1 cache on Redis hit
        fallbackCache.set(key, parsed);
        return parsed;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        if (!(global as any).upstashWarningLogged) {
          logger.warn(`[RECO CACHE] Upstash Limit Exceeded. Suppressing further Redis warnings.`);
          (global as any).upstashWarningLogged = true;
        }
      } else {
        logger.warn(`[RECO CACHE] Redis GET failed for ${key}: ${err.message}`);
      }
    }
  }
  return null;
}

/**
 * Unified cache set — writes to Redis (with TTL in seconds) and MemoryCache simultaneously.
 */
async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  fallbackCache: MemoryCache,
): Promise<void> {
  const ttlMs = ttlSeconds * 1000;
  fallbackCache.set(key, value, ttlMs);

  if (isRedisReady()) {
    try {
      await redisClient!.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err: any) {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        if (!(global as any).upstashWarningLogged) {
          logger.warn(`[RECO CACHE] Upstash Limit Exceeded. Suppressing further Redis warnings.`);
          (global as any).upstashWarningLogged = true;
        }
      } else {
        logger.warn(`[RECO CACHE] Redis SET failed for ${key}: ${err.message}`);
      }
    }
  }
}

/**
 * Unified cache delete.
 */
async function cacheDel(key: string, fallbackCache: MemoryCache): Promise<void> {
  fallbackCache.delete(key);

  if (isRedisReady()) {
    try {
      await redisClient!.del(key);
    } catch (err: any) {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        if (!(global as any).upstashWarningLogged) {
          logger.warn(`[RECO CACHE] Upstash Limit Exceeded. Suppressing further Redis warnings.`);
          (global as any).upstashWarningLogged = true;
        }
      } else {
        logger.warn(`[RECO CACHE] Redis DEL failed for ${key}: ${err.message}`);
      }
    }
  }
}

// ────────────────────────────────────────────────
// Public API — domain-specific cache helpers
// ────────────────────────────────────────────────

export const RecommendationCache = {
  // ── Clear All Recommendation Caches ──
  async clearAll() {
    // 1. Clear all L1 memory caches
    personalFeedCache.clear();
    trendingCache.clear();
    similarCache.clear();
    seasonalCache.clear();
    sessionCache.clear();
    coldStartCache.clear();
    ctrCache.clear();

    // 2. Clear all matching Redis keys
    if (isRedisReady()) {
      try {
        const keys = await redisClient!.keys('reco:*');
        if (keys && keys.length > 0) {
          await redisClient!.del(keys);
          logger.info(`[RECO CACHE] Successfully cleared ${keys.length} recommendation keys from Redis`);
        }
      } catch (err: any) {
        logger.error(`[RECO CACHE] Failed to clear Redis recommendation keys: ${err.message}`);
      }
    }
  },

  // ── Personalized Feed ──
  async getPersonalFeed(userId: string, page: string) {
    return cacheGet<any>(`reco:personal:${userId}:${page}`, personalFeedCache);
  },
  async setPersonalFeed(userId: string, page: string, data: any) {
    await cacheSet(`reco:personal:${userId}:${page}`, data, 3600, personalFeedCache); // 1 hour
  },
  async clearPersonalFeed(userId: string) {
    const pages = ['homepage', 'gallery', 'events', 'products'];
    for (const page of pages) {
      await cacheDel(`reco:personal:${userId}:${page}`, personalFeedCache);
    }
  },

  // ── Trending ──
  async getTrending(targetType: string) {
    return cacheGet<any>(`reco:trending:${targetType}`, trendingCache);
  },
  async setTrending(targetType: string, data: any) {
    await cacheSet(`reco:trending:${targetType}`, data, 900, trendingCache); // 15 min
  },

  // ── Seasonal ──
  async getSeasonalContext() {
    return cacheGet<any>('reco:seasonal:current', seasonalCache);
  },
  async setSeasonalContext(data: any) {
    await cacheSet('reco:seasonal:current', data, 3600, seasonalCache); // 1 hour
  },

  // ── Similar Items ──
  async getSimilar(targetId: string) {
    return cacheGet<any>(`reco:similar:${targetId}`, similarCache);
  },
  async setSimilar(targetId: string, data: any) {
    await cacheSet(`reco:similar:${targetId}`, data, 86400, similarCache); // 24 hours
  },

  // ── Complete Setup / Complementary ──
  async getCompleteSetup(productId: string) {
    return cacheGet<any>(`reco:complete:${productId}`, similarCache);
  },
  async setCompleteSetup(productId: string, data: any) {
    await cacheSet(`reco:complete:${productId}`, data, 86400, similarCache); // 24 hours
  },

  // ── Users Also Viewed ──
  async getAlsoViewed(targetId: string) {
    return cacheGet<any>(`reco:alsoviewed:${targetId}`, similarCache);
  },
  async setAlsoViewed(targetId: string, data: any) {
    await cacheSet(`reco:alsoviewed:${targetId}`, data, 86400, similarCache); // 24 hours
  },

  // ── Session Context (real-time adaptation) ──
  async getSessionContext(sessionId: string) {
    return cacheGet<any>(`reco:session:${sessionId}:context`, sessionCache);
  },
  async setSessionContext(sessionId: string, data: any) {
    await cacheSet(`reco:session:${sessionId}:context`, data, 1800, sessionCache); // 30 min
  },
  async updateSessionContext(sessionId: string, update: any) {
    const existing = (await this.getSessionContext(sessionId)) || {
      recentCategories: [],
      recentStyles: [],
      recentTargetIds: [],
      interactionCount: 0,
    };
    const merged = {
      recentCategories: [
        ...new Set([...(update.category ? [update.category] : []), ...existing.recentCategories]),
      ].slice(0, 10),
      recentStyles: [
        ...new Set([...(update.style ? [update.style] : []), ...existing.recentStyles]),
      ].slice(0, 5),
      recentTargetIds: [
        ...new Set([...(update.targetId ? [update.targetId] : []), ...existing.recentTargetIds]),
      ].slice(0, 20),
      interactionCount: existing.interactionCount + 1,
      lastEventType: update.eventType || existing.lastEventType,
    };
    await this.setSessionContext(sessionId, merged);
    return merged;
  },

  // ── Cold Start Feed ──
  async getColdStartFeed() {
    return cacheGet<any>('reco:cold:feed', coldStartCache);
  },
  async setColdStartFeed(data: any) {
    await cacheSet('reco:cold:feed', data, 900, coldStartCache); // 15 min
  },

  // ── CTR Tracking ──
  async incrementCTR(type: string, date: string, field: 'impressions' | 'clicks') {
    const key = `reco:analytics:ctr:${type}:${date}`;

    // Pure memory aggregation to prevent massive Redis write volume
    const cached = ctrCache.get<Record<string, number>>(key) || { impressions: 0, clicks: 0 };
    cached[field] = (cached[field] || 0) + 1;
    ctrCache.set(key, cached, 86400 * 1000);
  },

  async getCTR(type: string, date: string) {
    const key = `reco:analytics:ctr:${type}:${date}`;
    return ctrCache.get<Record<string, number>>(key) || { impressions: 0, clicks: 0 };
  },
};

export default RecommendationCache;
// Trigger nodemon restart to clear MemoryCache
