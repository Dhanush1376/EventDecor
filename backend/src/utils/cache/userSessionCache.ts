import redisClient from './redis';
import logger from '../../config/logger';
import crypto from 'crypto';

/** @internal Forensic experiment helper — hash identifiers for safe logging */
const forensicHashId = (id: string) =>
  crypto.createHash('sha256').update(id).digest('hex').slice(0, 12);

const PROFILE_TTL = 60;
const CART_TTL = 30;
const WISHLIST_TTL = 60;

export const sessionKeys = {
  profile: (userId: string) => `session:profile:${userId}`,
  cart: (userId: string) => `session:cart:${userId}`,
  wishlist: (userId: string) => `session:wishlist:${userId}`,
};

// In-flight request coalescing map to prevent cache stampedes
const inFlightRequests = new Map<string, Promise<any>>();

export const coalesceRequest = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
};

export const getCachedSessionJson = async <T>(key: string): Promise<T | null> => {
  if (!redisClient || !redisClient.isReady) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn(`[SESSION CACHE] Read failed for ${key}:`, err);
    return null;
  }
};

export const setCachedSessionJson = async (
  key: string,
  data: unknown,
  ttlSeconds: number,
): Promise<void> => {
  if (!redisClient || !redisClient.isReady) return;
  try {
    await redisClient.set(key, JSON.stringify(data), { EX: ttlSeconds });
  } catch (err) {
    logger.warn(`[SESSION CACHE] Write failed for ${key}:`, err);
  }
};

export const invalidateUserSessionCaches = async (
  userId: string,
  forensicRequestId?: string,
): Promise<void> => {
  const cartKey = sessionKeys.cart(userId);
  if (!redisClient || !redisClient.isReady) {
    if (forensicRequestId) {
      logger.error('[CART_FORENSIC][REDIS_DEL_FAILURE]', {
        requestId: forensicRequestId,
        hashedUserId: forensicHashId(userId),
        cartCacheKey: cartKey,
        errorName: 'RedisNotReady',
        errorMessage: 'Redis client not connected or not ready',
        redisReady: false,
        timestamp: Date.now(),
      });
    }
    return;
  }
  const keys = [sessionKeys.profile(userId), cartKey, sessionKeys.wishlist(userId)];
  try {
    // Execute DEL commands individually to prevent CROSSSLOT errors on Redis clusters
    await Promise.all(
      keys.map(async (key) => {
        try {
          await redisClient!.del(key);
          // Forensic logging at the actual Redis DEL boundary — cart key only
          if (forensicRequestId && key === cartKey) {
            logger.debug('[CART_FORENSIC][REDIS_DEL_SUCCESS]', {
              requestId: forensicRequestId,
              hashedUserId: forensicHashId(userId),
              cartCacheKey: key,
              timestamp: Date.now(),
            });
          }
        } catch (delErr: any) {
          // Forensic logging at the actual Redis DEL boundary — cart key only
          if (forensicRequestId && key === cartKey) {
            logger.error('[CART_FORENSIC][REDIS_DEL_FAILURE]', {
              requestId: forensicRequestId,
              hashedUserId: forensicHashId(userId),
              cartCacheKey: key,
              errorName: delErr?.name || 'UnknownError',
              errorMessage: delErr?.message || 'Unknown',
              redisReady: redisClient?.isReady ?? false,
              timestamp: Date.now(),
            });
          }
          throw delErr;
        }
      }),
    );
  } catch (err) {
    logger.warn(`[SESSION CACHE] Invalidation failed for user ${userId}:`, err);
  }
};

export const cacheProfile = (userId: string, data: unknown) =>
  setCachedSessionJson(sessionKeys.profile(userId), data, PROFILE_TTL);

export const cacheCart = async (
  userId: string,
  data: unknown,
  forensicRequestId?: string,
): Promise<void> => {
  const key = sessionKeys.cart(userId);
  if (!redisClient || !redisClient.isReady) {
    if (forensicRequestId) {
      logger.error('[CART_FORENSIC][REDIS_SET_FAILURE]', {
        requestId: forensicRequestId,
        hashedUserId: forensicHashId(userId),
        cartCacheKey: key,
        errorName: 'RedisNotReady',
        errorMessage: 'Redis client not connected or not ready',
        redisReady: false,
        timestamp: Date.now(),
      });
    }
    return;
  }
  try {
    // Actual Redis SET command
    await redisClient.set(key, JSON.stringify(data), { EX: CART_TTL });
    // Forensic logging at the actual Redis SET boundary
    if (forensicRequestId) {
      const cartData = data as any;
      logger.debug('[CART_FORENSIC][REDIS_SET_SUCCESS]', {
        requestId: forensicRequestId,
        hashedUserId: forensicHashId(userId),
        cartCacheKey: key,
        purchaseItemCount: cartData?.purchaseCart?.items?.length ?? 0,
        rentalItemCount: cartData?.rentalCart?.items?.length ?? 0,
        timestamp: Date.now(),
      });
    }
  } catch (err: any) {
    // Forensic logging at the actual Redis SET boundary
    if (forensicRequestId) {
      logger.error('[CART_FORENSIC][REDIS_SET_FAILURE]', {
        requestId: forensicRequestId,
        hashedUserId: forensicHashId(userId),
        cartCacheKey: key,
        errorName: err?.name || 'UnknownError',
        errorMessage: err?.message || 'Unknown',
        redisReady: redisClient?.isReady ?? false,
        timestamp: Date.now(),
      });
    }
    logger.warn(`[SESSION CACHE] Write failed for ${key}:`, err);
  }
};

export const cacheWishlist = (userId: string, data: unknown) =>
  setCachedSessionJson(sessionKeys.wishlist(userId), data, WISHLIST_TTL);
