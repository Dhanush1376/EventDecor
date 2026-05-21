import dotenv from 'dotenv';
import connectDB from '../config/db';
import { ensureIndexes } from '../config/ensureIndexes';
import logger from '../config/logger';

dotenv.config();

const createIndexes = async () => {
  try {
    await connectDB();
    await ensureIndexes();
    logger.info('✅ Index creation script completed.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to build indexes:', error);
    process.exit(1);
  }
};

createIndexes();
