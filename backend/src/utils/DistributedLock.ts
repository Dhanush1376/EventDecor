import { redisClient } from './redis';
import logger from '../config/logger';
import ApiError from './ApiError';

/**
 * A simple distributed lock implementation using Redis SET NX.
 * For a single Redis instance, this provides safe distributed locking.
 */
export class DistributedLock {
  /**
   * Attempts to acquire a lock for a given resource.
   * @param resourceKey The unique key representing the resource to lock.
   * @param ttlSeconds The maximum time (in seconds) the lock should be held to prevent deadlocks.
   * @returns A lock ID if successful, null if the lock is currently held by someone else.
   */
  static async acquireLock(resourceKey: string, ttlSeconds: number = 30): Promise<string | null> {
    if (!redisClient || !redisClient.isReady) {
      logger.warn(`[DistributedLock] Redis is down. Cannot acquire lock for ${resourceKey}`);
      return null;
    }

    const lockKey = `dlock:${resourceKey}`;
    const lockId = Math.random().toString(36).substring(2, 15);

    try {
      const acquired = await redisClient.set(lockKey, lockId, {
        NX: true,
        EX: ttlSeconds,
      });

      if (acquired) {
        return lockId;
      }
      return null;
    } catch (error) {
      logger.error(`[DistributedLock] Error acquiring lock for ${resourceKey}:`, error);
      return null;
    }
  }

  /**
   * Releases the lock if the provided lock ID matches the current lock owner.
   * @param resourceKey The unique key representing the resource.
   * @param lockId The lock ID returned by acquireLock.
   */
  static async releaseLock(resourceKey: string, lockId: string): Promise<boolean> {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    const lockKey = `dlock:${resourceKey}`;
    try {
      // Lua script to atomically check lock owner and delete if matched
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await redisClient.eval(script, {
        keys: [lockKey],
        arguments: [lockId],
      });
      return result === 1;
    } catch (error) {
      logger.error(`[DistributedLock] Error releasing lock for ${resourceKey}:`, error);
      return false;
    }
  }

  /**
   * Helper method to execute a function with an exclusive lock.
   * Automatically acquires and releases the lock.
   *
   * @param failClosed If true (default), throws 503 when Redis is down instead of silently bypassing.
   *   Set to false ONLY for non-critical operations where eventual consistency is acceptable.
   *
   *   CRITICAL: For event bookings and rental bookings, this MUST be true to prevent double bookings.
   */
  static async withLock<T>(
    resourceKey: string,
    operation: () => Promise<T>,
    ttlSeconds: number = 30,
    retryCount: number = 3,
    retryDelayMs: number = 200,
    failClosed: boolean = true,
  ): Promise<T> {
    let lockId: string | null = null;
    let attempts = 0;

    // Check Redis availability before attempting
    const redisAvailable = redisClient && redisClient.isReady;

    if (!redisAvailable) {
      if (failClosed) {
        logger.error(
          `[DistributedLock] Redis is down. FAIL-CLOSED for critical resource: ${resourceKey}`,
        );
        throw new ApiError(
          503,
          'Service temporarily unavailable. Please try again in a few moments.',
        );
      } else {
        logger.warn(
          `[DistributedLock] Redis is down. Bypassing lock for non-critical resource: ${resourceKey}`,
        );
        return await operation();
      }
    }

    while (attempts <= retryCount) {
      lockId = await this.acquireLock(resourceKey, ttlSeconds);
      if (lockId) {
        break;
      }
      attempts++;
      if (attempts <= retryCount) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    if (!lockId) {
      throw new ApiError(409, `Resource ${resourceKey} is currently locked. Please try again.`);
    }

    try {
      return await operation();
    } finally {
      if (lockId) {
        await this.releaseLock(resourceKey, lockId);
      }
    }
  }
}
