import { redisClient } from '../../utils/cache/redis';
import logger from '../../config/logger';

export class WhatsAppRateLimiter {
  // In-memory fallback if Redis is down
  private static cache = new Map<string, number[]>();

  /**
   * Checks if a user has exceeded the rate limit.
   * Returns true if allowed, false if rate limited.
   */
  static async checkLimit(
    identifier: string, // e.g., phone number or automation key
    maxRequests: number = 20,
    windowMs: number = 60000, // 1 minute
  ): Promise<boolean> {
    const now = Date.now();
    const key = `rate_limit:wa:${identifier}`;

    // 1. Try Redis first
    if (redisClient && redisClient.isReady) {
      try {
        const windowSeconds = Math.ceil(windowMs / 1000);

        // Multi-exec for atomic operation
        const multi = redisClient.multi();
        multi.zAdd(key, [{ score: now, value: now.toString() }]);
        multi.zRemRangeByScore(key, 0, now - windowMs);
        multi.zCard(key);
        multi.expire(key, windowSeconds);

        const results = await multi.exec();
        if (results && typeof results[2] === 'number') {
          const count = results[2] as number;
          if (count > maxRequests) {
            logger.warn(`[WhatsAppRateLimiter] Rate limit exceeded for ${identifier} via Redis`);
            return false;
          }
        }
        return true;
      } catch (err) {
        logger.error(`[WhatsAppRateLimiter] Redis error, falling back to memory`, err);
        // Fallthrough to memory
      }
    }

    // 2. In-Memory Fallback
    const timestamps = this.cache.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      logger.warn(`[WhatsAppRateLimiter] Rate limit exceeded for ${identifier} via Memory`);
      this.cache.set(key, validTimestamps);
      return false;
    }

    validTimestamps.push(now);
    this.cache.set(key, validTimestamps);

    // Occasional cleanup
    if (Math.random() < 0.05) this.cleanupMemory(now, windowMs);

    return true;
  }

  private static cleanupMemory(now: number, windowMs: number) {
    for (const [key, timestamps] of this.cache.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        this.cache.delete(key);
      } else {
        this.cache.set(key, valid);
      }
    }
  }
}
