import logger from '../../config/logger';
import { redisClient } from '../../utils/cache/redis';

export class IdempotencyManager {
  // Simple in-memory cache for idempotency fallback.
  private static cache = new Map<string, number>();

  /**
   * Checks if an event has already been processed within the given TTL (ms).
   * Generates a key based on the event and payload identifier (e.g., orderId).
   */
  public static async isDuplicate(
    event: string,
    aggregateId: string,
    ttlMs: number = 24 * 60 * 60 * 1000,
  ): Promise<boolean> {
    const key = `idempotency:${event}:${aggregateId}`;
    const now = Date.now();

    // 1. Try Redis first (Primary)
    if (redisClient && redisClient.isReady) {
      try {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        // SET key val NX EX ttl -> returns 'OK' if set, null if key already existed
        const result = await redisClient.set(key, now.toString(), {
          NX: true,
          EX: ttlSeconds,
        });

        if (result !== 'OK') {
          logger.debug(`[IDEMPOTENCY] Duplicate event detected in Redis for key: ${key}`);
          return true; // Key existed -> duplicate
        }
        return false; // Key was set -> not duplicate
      } catch (err) {
        logger.error(`[IDEMPOTENCY] Redis error, falling back to memory`, err);
        // Fallthrough to memory cache
      }
    }

    // 2. In-Memory Fallback
    const lastSeen = this.cache.get(key);
    if (lastSeen && now - lastSeen < ttlMs) {
      logger.debug(`[IDEMPOTENCY] Duplicate event detected in Memory for key: ${key}`);
      return true;
    }

    // Cleanup old entries randomly to prevent memory leak in this basic implementation
    if (Math.random() < 0.05) this.cleanup(now);

    this.cache.set(key, now);
    return false;
  }

  private static cleanup(now: number) {
    for (const [key, timestamp] of this.cache.entries()) {
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        this.cache.delete(key);
      }
    }
  }
}
