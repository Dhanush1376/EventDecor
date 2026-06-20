import ContentSection from '../models/ContentSection';
import redisClient from './redis';
import { safetyLockCache as memorySafetyLockCache } from './MemoryCache';

const REDIS_KEY = 'cache:admin_safety_lock';
const TTL_SECONDS = 5;

type SafetyLockDoc = { data?: { safetyLock?: boolean } } | null;

export const getSafetyLockDocument = async (): Promise<SafetyLockDoc> => {
  if (redisClient && redisClient.isReady) {
    try {
      const cached = await redisClient.get(REDIS_KEY);
      if (cached) {
        return JSON.parse(cached) as SafetyLockDoc;
      }
    } catch {
      // fall through to DB
    }
  }

  if (!redisClient || !redisClient.isReady) {
    return memorySafetyLockCache.getOrSet(
      'admin_safety_lock',
      async () => ContentSection.findOne({ sectionKey: 'admin_safety_lock' }).lean(),
      TTL_SECONDS * 1000,
    );
  }

  const doc = await ContentSection.findOne({ sectionKey: 'admin_safety_lock' }).lean();

  if (doc) {
    try {
      await redisClient.set(REDIS_KEY, JSON.stringify(doc), { EX: TTL_SECONDS });
    } catch {
      // non-fatal
    }
  }

  return doc;
};

/** Cross-instance safety lock cache bust (Redis + local fallback). */
export const invalidateSafetyLockCache = async (): Promise<void> => {
  memorySafetyLockCache.delete('admin_safety_lock');
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.del(REDIS_KEY);
    } catch {
      // non-fatal
    }
  }
};
