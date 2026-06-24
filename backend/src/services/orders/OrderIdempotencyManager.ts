import { redisClient } from '../../utils/cache/redis';
import logger from '../../config/logger';
import ApiError from '../../utils/ApiError';

export class OrderIdempotencyManager {
  // Simple in-memory fallback for local dev when Redis is not active/configured
  private static inMemoryLocks = new Set<string>();
  private static inMemoryResponses = new Map<string, any>();

  /**
   * Acquire an idempotency lock for the given key and user.
   * If Redis is down, it FAILS CLOSED, rejecting the request to prevent duplicate processing.
   */
  static async acquireLock(userId: string, idempotencyKey: string): Promise<void> {
    if (!idempotencyKey) {
      return; // No idempotency requested
    }

    const lockKey = `lock:order:${userId}:${idempotencyKey}`;

    if (!redisClient || !redisClient.isReady) {
      const requireRedis = process.env.REQUIRE_REDIS === 'true';

      if (requireRedis) {
        logger.error(`[IDEMPOTENCY] Redis is down. Failing closed for key: ${idempotencyKey}`);
        throw new ApiError(
          503,
          'System is temporarily unavailable to process safe transactions. Please try again.',
        );
      } else {
        logger.warn(
          `[IDEMPOTENCY] Redis is down. Falling back to in-memory idempotency for key: ${idempotencyKey}`,
        );
        if (this.inMemoryLocks.has(lockKey)) {
          logger.warn(
            `[IDEMPOTENCY] Concurrent request detected (in-memory) for key: ${idempotencyKey}`,
          );
          throw new ApiError(409, 'Your request is currently being processed. Please wait.');
        }
        this.inMemoryLocks.add(lockKey);
        // Automatically release after 30 seconds to simulate Redis TTL
        setTimeout(() => {
          this.inMemoryLocks.delete(lockKey);
        }, 30000);
        return;
      }
    }

    // Attempt to acquire lock. Expires in 30 seconds to prevent deadlocks if process crashes.
    const acquired = await redisClient.set(lockKey, 'locked', { NX: true, EX: 30 });

    if (!acquired) {
      logger.warn(`[IDEMPOTENCY] Concurrent request detected for key: ${idempotencyKey}`);
      throw new ApiError(409, 'Your request is currently being processed. Please wait.');
    }
  }

  /**
   * Checks if an order response is already cached for this idempotency key.
   */
  static async getCachedResponse(userId: string, idempotencyKey: string): Promise<any | null> {
    if (!idempotencyKey) {
      return null;
    }

    const resultKey = `idempotency:order:${userId}:${idempotencyKey}`;

    if (!redisClient || !redisClient.isReady) {
      const requireRedis = process.env.REQUIRE_REDIS === 'true';

      if (requireRedis) {
        return null;
      }
      return this.inMemoryResponses.get(resultKey) || null;
    }

    try {
      const cachedResponse = await redisClient.get(resultKey);
      if (cachedResponse) {
        logger.info(`[IDEMPOTENCY] Returning cached order creation for key: ${idempotencyKey}`);
        return JSON.parse(cachedResponse);
      }
    } catch (err) {
      logger.error('Redis error during idempotency check:', err);
      throw new ApiError(503, 'System is temporarily unavailable.');
    }

    return null;
  }

  /**
   * Caches the successful response and releases the lock.
   */
  static async cacheResponseAndReleaseLock(
    userId: string,
    idempotencyKey: string,
    response: any,
  ): Promise<void> {
    if (!idempotencyKey) {
      return;
    }

    const lockKey = `lock:order:${userId}:${idempotencyKey}`;
    const resultKey = `idempotency:order:${userId}:${idempotencyKey}`;

    if (!redisClient || !redisClient.isReady) {
      const requireRedis = process.env.REQUIRE_REDIS === 'true';

      if (!requireRedis) {
        this.inMemoryResponses.set(resultKey, response);
        // Automatically evict after 24 hours to simulate Redis TTL
        setTimeout(() => {
          this.inMemoryResponses.delete(resultKey);
        }, 86400000);
        this.inMemoryLocks.delete(lockKey);
      }
      return;
    }

    try {
      // Cache the result for 24 hours
      await redisClient.set(resultKey, JSON.stringify(response), { EX: 86400 });
      // Delete the active processing lock
      await redisClient.del(lockKey);
    } catch (err) {
      logger.error('Redis error during idempotency save/release:', err);
    }
  }

  /**
   * Releases the lock in case of an error (so the user can retry).
   */
  static async releaseLock(userId: string, idempotencyKey: string): Promise<void> {
    if (!idempotencyKey) {
      return;
    }

    const lockKey = `lock:order:${userId}:${idempotencyKey}`;

    if (!redisClient || !redisClient.isReady) {
      const requireRedis = process.env.REQUIRE_REDIS === 'true';

      if (!requireRedis) {
        this.inMemoryLocks.delete(lockKey);
      }
      return;
    }

    try {
      await redisClient.del(lockKey);
    } catch (err) {
      logger.error('Redis error during idempotency lock release:', err);
    }
  }
}
