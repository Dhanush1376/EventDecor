import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initRedis, closeRedisConnections, redisClient } from '../src/utils/cache/redis';

export async function main() {
  try {
    await initRedis();

    if (redisClient) {
      const trendingNamespace = 'search:trending:*';
      const discoveryNamespace = 'search:full:search:discovery*';

      console.log(
        `Targeting Redis namespaces for invalidation: ${trendingNamespace} and ${discoveryNamespace}`,
      );

      const trendingKeys = await redisClient.keys(trendingNamespace);
      for (const key of trendingKeys) {
        await redisClient.del(key);
      }
      console.log(`Cleared ${trendingKeys.length} trending cache keys.`);

      const discoveryKeys = await redisClient.keys(discoveryNamespace);
      for (const key of discoveryKeys) {
        await redisClient.del(key);
      }
      console.log(`Cleared ${discoveryKeys.length} discovery cache keys.`);

      console.log('Cache namespaces cleared successfully.');
    } else {
      console.log('No redis client configured.');
    }
  } catch (err) {
    console.error('Error during redis cache invalidation:', err);
    process.exit(1);
  } finally {
    await closeRedisConnections();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
