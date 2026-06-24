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

  // Retrieve FallbackJob schema/model
  const FallbackJobSchema = new mongoose.Schema({}, { strict: false });
  const FallbackJob =
    mongoose.models.FallbackJob || mongoose.model('FallbackJob', FallbackJobSchema, 'fallbackjobs');

  // Find all fallback jobs in the last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const jobs = await FallbackJob.find({
    createdAt: { $gte: fifteenMinutesAgo },
  })
    .sort({ createdAt: -1 })
    .lean();

  console.log(`Found ${jobs.length} recent fallback jobs:`);
  console.log(JSON.stringify(jobs, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
