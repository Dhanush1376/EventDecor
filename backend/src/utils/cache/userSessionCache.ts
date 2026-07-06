import redisClient from './redis';
import logger from '../../config/logger';

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

export const invalidateUserSessionCaches = async (userId: string): Promise<void> => {
  if (!redisClient || !redisClient.isReady) return;
  const keys = [
    sessionKeys.profile(userId),
    sessionKeys.cart(userId),
    sessionKeys.wishlist(userId),
  ];
  try {
    // Execute DEL commands individually to prevent CROSSSLOT errors on Redis clusters
    await Promise.all(keys.map((key) => redisClient.del(key)));
  } catch (err) {
    logger.warn(`[SESSION CACHE] Invalidation failed for user ${userId}:`, err);
  }
};

export const cacheProfile = (userId: string, data: unknown) =>
  setCachedSessionJson(sessionKeys.profile(userId), data, PROFILE_TTL);

export const cacheCart = (userId: string, data: unknown) =>
  setCachedSessionJson(sessionKeys.cart(userId), data, CART_TTL);

export const cacheWishlist = (userId: string, data: unknown) =>
  setCachedSessionJson(sessionKeys.wishlist(userId), data, WISHLIST_TTL);
