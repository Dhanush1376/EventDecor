import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables from .env.local in backend
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set!');
    return;
  }

  await mongoose.connect(mongoUri);

  // Retrieve NotificationLog schema/model
  const NotificationLogSchema = new mongoose.Schema({}, { strict: false });
  const NotificationLog =
    mongoose.models.NotificationLog ||
    mongoose.model('NotificationLog', NotificationLogSchema, 'notificationlogs');

  // Find all logs in the last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  console.log('Searching for notification logs since:', fifteenMinutesAgo.toISOString());

  const logs = await NotificationLog.find({
    createdAt: { $gte: fifteenMinutesAgo },
  })
    .sort({ createdAt: -1 })
    .lean();

  console.log(`Found ${logs.length} recent notification logs:`);
  console.log(JSON.stringify(logs, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
