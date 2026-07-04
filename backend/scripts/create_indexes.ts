import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from '../src/config/logger';

// Load environment variables (fallback to local if available)
try {
  const localEnv = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  }
} catch (e) {
  // Ignore
}
dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  logger.error('MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

async function run() {
  try {
    const maskedUri = mongoUri.includes('@') ? mongoUri.split('@').pop() : mongoUri;
    logger.info(`Connecting to MongoDB at ${maskedUri}...`);
    await mongoose.connect(mongoUri);
    logger.info('Connected successfully. Scanning models...');

    const modelsDir = path.resolve(__dirname, '../src/models');
    const files = fs
      .readdirSync(modelsDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

    for (const file of files) {
      require(path.join(modelsDir, file));
    }

    const modelNames = mongoose.modelNames();
    logger.info(`Found ${modelNames.length} models. Syncing indexes...`);

    for (const modelName of modelNames) {
      const Model = mongoose.model(modelName);
      if (process.env.SKIP_INDEX_BUILD === 'true') {
        logger.info(`Skipping actual sync for ${modelName} due to SKIP_INDEX_BUILD=true`);
        continue;
      }
      logger.info(`Syncing indexes for ${modelName}...`);
      await Model.syncIndexes();
    }

    logger.info('All indexes processed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error syncing indexes:', error);
    process.exit(1);
  }
}

run();
