import mongoose from 'mongoose';
import logger from './logger';

const connectDB = async (): Promise<void> => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    logger.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  const maxPoolSize = Number(process.env.MONGO_POOL_SIZE) || 20;
  const options = {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize,
    minPoolSize: Math.max(2, Math.floor(maxPoolSize / 4)),
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4, // Use IPv4
  };

  // Register connection event listeners to track DB health and connectivity states
  mongoose.connection.on('connected', () => {
    logger.info('🟢 [DATABASE] MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`🔴 [DATABASE] MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('🟡 [DATABASE] MongoDB disconnected. Mongoose will automatically attempt to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('🟢 [DATABASE] MongoDB reconnected successfully');
  });

  let retryCount = 0;
  const maxRetries = 10;
  const baseDelay = 1000; // 1 second

  return new Promise<void>((resolve, reject) => {
    const connectWithRetry = async () => {
      try {
        await mongoose.connect(MONGO_URI, options);
        logger.info('🚀 [DATABASE] Initial MongoDB Connection Succeeded');
        resolve();
      } catch (err: any) {
        retryCount++;
        if (retryCount > maxRetries) {
          logger.error(`❌ [DATABASE] MongoDB connection failed after ${maxRetries} retries: ${err.message}`);
          reject(err);
          process.exit(1);
        }

        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30s delay
        logger.warn(`⚠️ [DATABASE] MongoDB connection attempt ${retryCount} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
        
        setTimeout(connectWithRetry, delay);
      }
    };

    connectWithRetry();
  });
};

export default connectDB;
