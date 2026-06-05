import { redisClient } from '../../utils/redis';
import logger from '../../config/logger';
import ApiError from '../../utils/ApiError';

export class OrderIdempotencyManager {
  /**
   * Acquire an idempotency lock for the given key and user.
   * If Redis is down, it FAILS CLOSED, rejecting the request to prevent duplicate processing.
   */
  static async acquireLock(userId: string, idempotencyKey: string): Promise<void> {
    if (!idempotencyKey) {
      return; // No idempotency requested
    }

    if (!redisClient || !redisClient.isReady) {
      logger.error(`[IDEMPOTENCY] Redis is down. Failing closed for key: ${idempotencyKey}`);
      throw new ApiError(
        503,
        'System is temporarily unavailable to process safe transactions. Please try again.',
      );
    }

    const lockKey = `lock:order:${userId}:${idempotencyKey}`;

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
    if (!idempotencyKey || !redisClient || !redisClient.isReady) {
      return null;
    }

    const resultKey = `idempotency:order:${userId}:${idempotencyKey}`;
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
    if (!idempotencyKey || !redisClient || !redisClient.isReady) {
      return;
    }

    const lockKey = `lock:order:${userId}:${idempotencyKey}`;
    const resultKey = `idempotency:order:${userId}:${idempotencyKey}`;

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
    if (!idempotencyKey || !redisClient || !redisClient.isReady) {
      return;
    }

    const lockKey = `lock:order:${userId}:${idempotencyKey}`;
    try {
      await redisClient.del(lockKey);
    } catch (err) {
      logger.error('Redis error during idempotency lock release:', err);
    }
  }
}
