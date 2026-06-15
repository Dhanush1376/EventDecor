import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VisualSearchConfig from '../models/VisualSearchConfig';
import { bulkGenerateProductTags } from '../services/visualSearchService';

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set in environment variables');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // 1. Update similarity threshold to 0.4
  console.log('Updating Visual Search Config...');
  const config = await VisualSearchConfig.findOne();
  if (config) {
    config.similarityThreshold = 0.4;
    await config.save();
    console.log('Successfully updated similarityThreshold to 0.4');
  } else {
    console.warn('VisualSearchConfig not found. Creating default config with threshold 0.4...');
    await VisualSearchConfig.create({
      enabled: true,
      similarityThreshold: 0.4,
      provider: {
        name: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        isValidated: !!process.env.GROQ_API_KEY,
      },
    });
  }

  // 2. Run bulk tag generation for all active products
  console.log('Running bulk tag generation for up to 20 products...');
  const result = await bulkGenerateProductTags(20);
  console.log('Bulk tag generation finished!');
  console.log(
    `Processed: ${result.processed}, Failed: ${result.failed}, Total queued in batch: ${result.total}`,
  );

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('Error in fix-and-tag script:', err);
  mongoose.disconnect();
});
