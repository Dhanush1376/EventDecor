import FeatureFlag from '../models/FeatureFlag';
import redisClient from '../utils/cache/redis';
import logger from '../config/logger';

const REDIS_KEY_PREFIX = 'feature_flag:';
const CACHE_TTL = 300; // 5 minutes cache fallback

export class FeatureFlagService {
  /**
   * Initializes all flags into Redis cache. Called on startup or when flags change.
   */
  static async initializeCache(): Promise<void> {
    try {
      const flags = await FeatureFlag.find();
      if (!redisClient || !redisClient.isReady) return;

      for (const flag of flags) {
        await redisClient.set(`${REDIS_KEY_PREFIX}${flag.key}`, flag.isEnabled ? '1' : '0');
      }
      logger.info(`[FeatureFlagService] Initialized ${flags.length} flags into Redis cache`);
    } catch (err) {
      logger.error('[FeatureFlagService] Failed to initialize cache', err);
    }
  }

  /**
   * Checks if a feature is enabled. O(1) Redis lookup.
   * If Redis is down, falls back to DB query and caches locally.
   */
  static async isEnabled(key: string, defaultValue = false): Promise<boolean> {
    try {
      if (redisClient && redisClient.isReady) {
        const val = await redisClient.get(`${REDIS_KEY_PREFIX}${key}`);
        if (val !== null) {
          return val === '1';
        }
      }

      // DB Fallback
      const flag = await FeatureFlag.findOne({ key });
      const isEnabled = flag ? flag.isEnabled : defaultValue;

      if (redisClient && redisClient.isReady) {
        await redisClient.set(`${REDIS_KEY_PREFIX}${key}`, isEnabled ? '1' : '0', {
          EX: CACHE_TTL,
        });
      }

      return isEnabled;
    } catch (err) {
      logger.error(`[FeatureFlagService] Error checking flag ${key}`, err);
      return defaultValue;
    }
  }

  /**
   * Admin toggles a flag and invalidates cache.
   */
  static async toggleFlag(key: string, isEnabled: boolean): Promise<void> {
    await FeatureFlag.findOneAndUpdate({ key }, { isEnabled }, { upsert: true, new: true });

    if (redisClient && redisClient.isReady) {
      await redisClient.set(`${REDIS_KEY_PREFIX}${key}`, isEnabled ? '1' : '0');
    }
    logger.info(`[FeatureFlagService] Flag ${key} set to ${isEnabled}`);
  }
}
