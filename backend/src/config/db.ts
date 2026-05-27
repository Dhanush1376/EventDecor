import mongoose from 'mongoose';
import logger from './logger';

const connectDB = async (): Promise<void> => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    logger.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  // Production safety: reject localhost/direct MongoDB URIs (require Atlas SRV)
  if (process.env.NODE_ENV === 'production') {
    if (MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
      logger.error('[DATABASE] CRITICAL: MONGO_URI must not point to localhost in production');
      process.exit(1);
    }
  }

  const maxPoolSize = Number(process.env.MONGO_POOL_SIZE) || 20;
  const options: mongoose.ConnectOptions = {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize,
    minPoolSize: Math.max(2, Math.floor(maxPoolSize / 4)),
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000, // Detect disconnects faster than default 30s
    maxIdleTimeMS: 60000, // Release idle connections to reduce resource usage
    family: 4, // Use IPv4
    bufferCommands: false, // Fail fast on transient disconnects instead of hanging API endpoints
    // Network compression — reduces egress bandwidth and improves security by reducing data volume
    compressors: ['zstd', 'snappy'],
    // Complement retryWrites=true (typically in connection string) with retryReads
    retryReads: true,
    // MongoDB Stable API — surfaces deprecation errors without breaking existing aggregate pipelines
    serverApi: { version: '1' as const, strict: false, deprecationErrors: true },
  };

  // Register connection event listeners to track DB health and connectivity states
  if (mongoose.connection.listeners('connected').length === 0) {
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
  }

  const maxRetries = 5;
  let attempt = 1;
  let delay = 1000; // start with 1s delay

  while (attempt <= maxRetries) {
    try {
      logger.info(`🔄 [DATABASE] Connecting to MongoDB (Attempt ${attempt}/${maxRetries})...`);
      await mongoose.connect(MONGO_URI, options);
      logger.info('🚀 [DATABASE] Initial MongoDB Connection Succeeded');
      return;
    } catch (err: any) {
      logger.error(`❌ [DATABASE] MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts.`);
      }
      attempt++;
      logger.info(`🔄 [DATABASE] Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
};

export const isDbReady = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export default connectDB;
