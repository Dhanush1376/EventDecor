import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function clearCache() {
  try {
    const { redisClient } = require('./src/utils/cache/redis');
    const { RecommendationCache } = require('./src/services/recommendation/recommendationCache');

    // Connect to Redis if needed
    if (redisClient && !redisClient.isOpen) {
      await redisClient.connect();
    }

    await RecommendationCache.clearAll();
    console.log('Successfully cleared all recommendation caches');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clearCache();
