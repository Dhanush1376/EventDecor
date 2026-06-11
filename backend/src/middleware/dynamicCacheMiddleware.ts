import { Request, Response, NextFunction } from 'express';
import redisClient from '../utils/redis';
import { getPublicCacheVersion, getAdminAnalyticsCacheVersion } from '../utils/cacheVersion';
import logger from '../config/logger';
import { MemoryCache } from '../utils/MemoryCache';

const fallbackResponseCache = new MemoryCache({
  defaultTtlMs: 60 * 1000,
  maxKeys: 500,
  name: 'fallbackResponseCache',
});

export type CacheScope = 'public' | 'admin';

/**
 * A unified Redis-backed JSON response cache middleware.
 * @param ttlSeconds The time-to-live for the cached response in seconds
 * @param scope Determines prefix, cache versioning, and whether auth headers bypass the cache
 */
export const dynamicResponseCache = (ttlSeconds: number, scope: CacheScope = 'public') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    // For public routes, authenticated requests should bypass cache to prevent leaking state
    if (scope === 'public') {
      const isAuthRequest = req.headers.authorization || req.cookies?.siri_refresh_token;
      if (isAuthRequest) return next();
    }

    // If redis is unavailable but we are in production, we fallback to memory cache
    if (
      !redisClient &&
      process.env.NODE_ENV === 'production' &&
      process.env.REQUIRE_REDIS === 'true'
    ) {
      logger.warn(
        `[REDIS CACHE] REDIS_URL missing in production. Falling back to MemoryCache for ${scope}`,
      );
    }

    try {
      const version =
        scope === 'admin' ? await getAdminAnalyticsCacheVersion() : await getPublicCacheVersion();

      const prefix = scope === 'admin' ? 'admin:resp' : 'api:resp';

      // Admin requests usually don't cache by HTTP method, just by URL, but adding method is safer
      const cacheKey = `${prefix}:v${version}:${req.method}:${req.originalUrl}`;

      let cached: string | null = null;
      if (redisClient) {
        cached = await redisClient.get(cacheKey);
      } else {
        cached = fallbackResponseCache.get<string>(cacheKey);
        console.log(`[Cache Debug] Fallback Cache GET for ${cacheKey}:`, cached ? 'HIT' : 'MISS');
      }

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).send(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && body !== undefined) {
          const stringified = typeof body === 'string' ? body : JSON.stringify(body);
          console.log(
            `[Cache Debug] Saving to cache: ${cacheKey}, Size: ${stringified.length} bytes`,
          );
          if (redisClient) {
            redisClient
              .setex(cacheKey, ttlSeconds, stringified)
              .catch((err) =>
                logger.warn(`[${scope.toUpperCase()} CACHE] Failed to store response:`, err),
              );
          } else {
            fallbackResponseCache.set(cacheKey, stringified, ttlSeconds * 1000);
            console.log(`[Cache Debug] Fallback Cache SET for ${cacheKey}`);
          }
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.warn(`[${scope.toUpperCase()} CACHE] Middleware error — bypassing cache:`, err);
      next();
    }
  };
};
