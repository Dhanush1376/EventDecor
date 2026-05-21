import { Request, Response, NextFunction } from 'express';
import redisClient from '../utils/redis';
import { getPublicCacheVersion } from '../utils/cacheVersion';
import logger from '../config/logger';

/**
 * Redis-backed JSON response cache for anonymous public GET requests.
 * Cache keys include the public cache version token (invalidated on CMS/product writes).
 */
export const redisResponseCache = (ttlSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const isAuthRequest = req.headers.authorization || req.cookies?.siri_refresh_token;
    if (isAuthRequest) return next();

    if (!redisClient) return next();

    try {
      const version = await getPublicCacheVersion();
      const cacheKey = `api:resp:v${version}:${req.method}:${req.originalUrl}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).send(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && body !== undefined) {
          redisClient!
            .setex(cacheKey, ttlSeconds, JSON.stringify(body))
            .catch((err) => logger.warn('[REDIS CACHE] Failed to store response:', err));
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.warn('[REDIS CACHE] Middleware error — bypassing cache:', err);
      next();
    }
  };
};
