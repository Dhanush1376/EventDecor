import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/db';

/**
 * Script to restore a specific JSON backup file into a collection.
 *
 * Usage:
 * ts-node src/scripts/restoreTools.ts <collectionName> <absolute_path_to_json>
 */
const runRestore = async () => {
  const collectionName = process.argv[2];
  const backupFilePath = process.argv[3];

  if (!collectionName || !backupFilePath) {
    logger.error('Usage: ts-node restoreTools.ts <collectionName> <absolute_path_to_json>');
    process.exit(1);
  }

  if (!fs.existsSync(backupFilePath)) {
    logger.error(`Backup file not found at: ${backupFilePath}`);
    process.exit(1);
  }

  // 1. Critical Safeguards
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL: restoreTools.ts cannot be run in production mode.');
    process.exit(1);
  }

  const MONGO_URI = process.env.MONGO_URI || '';
  if (MONGO_URI.includes('mongodb.net') || MONGO_URI.includes('mongodb+srv')) {
    logger.error('FATAL: restoreTools.ts cannot be run against an Atlas cluster.');
    process.exit(1);
  }

  if (process.env.I_KNOW_THIS_WIPES_DATA !== 'true') {
    logger.error(
      '❌ FATAL: Must set I_KNOW_THIS_WIPES_DATA=true to authorize mass data modification.',
    );
    process.exit(1);
  }

  try {
    logger.info(`Connecting to database via safe connection manager...`);
    await connectDB();
    logger.info(`Connected. Restoring to collection: ${collectionName}`);

    const fileContent = fs.readFileSync(backupFilePath, 'utf8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      throw new Error('Backup file does not contain a JSON array.');
    }

    const collection = mongoose.connection.collection(collectionName);

    logger.info(`Preparing to restore ${data.length} documents...`);

    // We iterate and insert to avoid huge payload limits
    let successCount = 0;
    let failCount = 0;

    for (const doc of data) {
      try {
        // Convert string _id back to ObjectId if needed
        if (doc._id && typeof doc._id === 'string' && mongoose.Types.ObjectId.isValid(doc._id)) {
          doc._id = new mongoose.Types.ObjectId(doc._id);
        }
        await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
        successCount++;
      } catch {
        failCount++;
      }
    }

    logger.info(`Restore complete: ${successCount} successful, ${failCount} failed.`);
  } catch (error: any) {
    logger.error(`Restore failed: ${error.message}`);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed.');
    process.exit(0);
  }
};

if (require.main === module) {
  runRestore();
}
