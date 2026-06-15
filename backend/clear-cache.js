const { initRedis } = require('./dist/src/utils/redis');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  try {
    const redisClient = await initRedis();
    console.log('Redis connected');

    const keys = await redisClient.keys('vs:*');
    console.log('Found keys:', keys);

    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log('Deleted keys');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
