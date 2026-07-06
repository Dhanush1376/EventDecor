import mongoose from 'mongoose';
import { clearAllCaches } from '../src/services/search/searchCache';
import { initRedis, closeRedisConnections, redisClient } from '../src/utils/cache/redis';

export async function main() {
  try {
    console.log('Invalidating memory cache...');
    await clearAllCaches();
    console.log('Memory cache invalidated.');

    await initRedis();

    if (redisClient) {
      const namespace = 'search:trending:*';
      console.log(`Targeting Redis namespace for invalidation: ${namespace}`);

      const keys = await redisClient.keys(namespace);
      if (keys.length > 0) {
        for (const key of keys) {
          await redisClient.del(key);
        }
        console.log(`Cleared ${keys.length} keys in Redis trending cache namespace.`);
      } else {
        console.log('No keys found for the specified namespace.');
      }
    } else {
      console.log('No redis client configured.');
    }
  } catch (err) {
    console.error('Error during cache invalidation:', err);
    process.exit(1);
  } finally {
    await closeRedisConnections();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
