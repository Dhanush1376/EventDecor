import { Request, Response, NextFunction } from 'express';
import redisClient from '../utils/redis';
import { getAdminAnalyticsCacheVersion } from '../utils/cacheVersion';
import logger from '../config/logger';

/**
 * Short-lived Redis cache for admin analytics GET responses (shared across staff).
 */
export const adminResponseCache = (ttlSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || !redisClient) return next();

    try {
      const version = await getAdminAnalyticsCacheVersion();
      const cacheKey = `admin:resp:v${version}:${req.originalUrl}`;

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
            .catch((err) => logger.warn('[ADMIN CACHE] Failed to store response:', err));
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.warn('[ADMIN CACHE] Middleware error — bypassing cache:', err);
      next();
    }
  };
};
