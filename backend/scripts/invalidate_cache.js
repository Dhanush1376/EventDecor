const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
// Import the compiled redisClient and userSessionCache from dist
// Actually it's easier to just connect to redis directly if we have the URL
const Redis = require('ioredis');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const usersColl = mongoose.connection.collection('users');

  const admins = await usersColl
    .find({ email: { $in: ['sirisha.atmakuri@gmail.com', 'dhanush1376@gmail.com'] } })
    .toArray();

  if (admins.length === 0) {
    console.log('No admins found.');
    await mongoose.disconnect();
    return;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('No REDIS_URL found in .env, skipping Redis cache invalidation.');
    await mongoose.disconnect();
    return;
  }

  const redis = new Redis(redisUrl);

  for (const admin of admins) {
    const userId = admin._id.toString();
    const profileKey = `session:profile:${userId}`;
    const cartKey = `session:cart:${userId}`;
    const wishlistKey = `session:wishlist:${userId}`;

    await redis.del(profileKey, cartKey, wishlistKey);
    console.log(
      `Cleared Redis cache for user: ${admin.email} (ID: ${userId}, Role: ${admin.role})`,
    );
  }

  await redis.quit();
  await mongoose.disconnect();
  console.log('Cache invalidation complete.');
}

run().catch(console.error);
