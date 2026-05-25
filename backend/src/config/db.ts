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
    bufferCommands: false, // Fail fast on transient disconnects instead of hanging API endpoints
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

  try {
    await mongoose.connect(MONGO_URI, options);
    logger.info('🚀 [DATABASE] Initial MongoDB Connection Succeeded');
  } catch (err: any) {
    // We log the error but DO NOT exit or reject if we want it to keep trying in the background
    // Mongoose handles reconnections natively based on its options
    logger.error(`❌ [DATABASE] Initial MongoDB connection failed: ${err.message}. Mongoose will keep retrying in the background.`);
  }
};

export default connectDB;
