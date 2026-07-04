import { Request, Response, NextFunction } from 'express';
import { MemoryCache } from '../utils/cache/MemoryCache';
import redisClient from '../utils/cache/redis';
import asyncHandler from '../utils/asyncHandler';
import logger from '../config/logger';

const inFlightRequests = new MemoryCache({
  defaultTtlMs: 30_000,
  maxKeys: 500,
  name: 'idempotency',
});

export const idempotencyGuard = () => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) return next(); // No key = no protection (backward compatible)

    const userId = (req as any).user?.id || 'anon';
    const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

    // Check Redis first, memory fallback
    let cached: string | null;
    try {
      if (redisClient?.isReady) {
        cached = await redisClient.get(cacheKey);
      } else {
        cached = inFlightRequests.get<string>(cacheKey);
      }
    } catch (err) {
      logger.warn(`Redis get failed for idempotency, falling back to memory: ${err}`);
      cached = inFlightRequests.get<string>(cacheKey);
    }

    if (cached === 'PROCESSING') {
      return res.status(409).json({
        success: false,
        message: 'This request is already being processed. Please wait.',
      });
    }

    if (cached && cached !== 'PROCESSING') {
      // Return the cached response
      const cachedResponse = JSON.parse(cached);
      return res.status(cachedResponse.statusCode || 200).json(cachedResponse.body);
    }

    // Mark as in-flight
    try {
      if (redisClient?.isReady) {
        await redisClient.setEx(cacheKey, 30, 'PROCESSING');
      } else {
        inFlightRequests.set(cacheKey, 'PROCESSING');
      }
    } catch (err) {
      logger.warn(`Redis set failed for idempotency, falling back to memory: ${err}`);
      inFlightRequests.set(cacheKey, 'PROCESSING');
    }

    // Intercept response to cache the result
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const responseData = JSON.stringify({ statusCode: res.statusCode, body });
      try {
        if (redisClient?.isReady) {
          redisClient.setEx(cacheKey, 300, responseData).catch(() => {}); // Cache for 5 min
        } else {
          inFlightRequests.set(cacheKey, responseData, 300_000);
        }
      } catch (_err) {
        inFlightRequests.set(cacheKey, responseData, 300_000);
      }
      return originalJson(body);
    };

    next();
  });
};
