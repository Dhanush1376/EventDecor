import mongoose from 'mongoose';
import os from 'os';
import dns from 'dns';
import logger from './logger';
import { DestructionGuard } from '../utils/DestructionGuard';

// Prevent querySrv ETIMEOUT on local environments by using reliable public DNS resolvers
const isLocal =
  process.env.NODE_ENV !== 'production' && !process.env.RENDER && !process.env.RAILWAY_STATIC_URL;
if (isLocal) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err: any) {
    logger.warn('[DATABASE] Failed to set public DNS resolvers: ' + err.message);
  }
}

// Enforce global maxTimeMS to prevent runaway database queries
mongoose.plugin((schema) => {
  const defaultTimeout = 15000; // 15 seconds for regular queries
  const aggTimeout = 30000; // 30 seconds for aggregations

  schema.pre('find', function () {
    if (!(this as any).options.maxTimeMS) (this as any).maxTimeMS(defaultTimeout);
  });
  schema.pre('findOne', function () {
    if (!(this as any).options.maxTimeMS) (this as any).maxTimeMS(defaultTimeout);
  });
  schema.pre('findOneAndUpdate', function () {
    if (!(this as any).options.maxTimeMS) (this as any).maxTimeMS(defaultTimeout);
  });
  schema.pre('countDocuments', function () {
    if (!(this as any).options.maxTimeMS) (this as any).maxTimeMS(defaultTimeout);
  });
  schema.pre('aggregate', function () {
    // Add maxTimeMS to aggregation pipeline options
    const options = (this as any).options;
    if (!options.maxTimeMS) options.maxTimeMS = aggTimeout;
  });
});

// Apply global Destruction Guard to all schemas
mongoose.plugin(DestructionGuard);

export interface DbMetrics {
  readyState: number;
  readyStateName: string;
  maxPoolSize: number;
  minPoolSize: number;
  lastPingSuccess: boolean | null;
  lastPingTime: string | null;
  pingDurationMs: number | null;
  totalFailedPings: number;
  reconnectAttempts: number;
}

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private cachedConnectionPromise: Promise<typeof mongoose> | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  // Metrics tracking
  private lastPingSuccess: boolean | null = null;
  private lastPingTime: Date | null = null;
  private pingDurationMs: number | null = null;
  private totalFailedPings = 0;
  private reconnectAttempts = 0;

  // Pool Configuration
  private maxPoolSize = 50;
  private minPoolSize = 10;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Determine the connection pool configuration based on PM2 instances and CPU cores.
   * Target total connection budget is 100.
   */
  private calculatePoolLimits(): { maxPoolSize: number; minPoolSize: number } {
    const envMax = process.env.MONGO_POOL_SIZE ? Number(process.env.MONGO_POOL_SIZE) : null;
    const envMin = process.env.MONGO_MIN_POOL_SIZE ? Number(process.env.MONGO_MIN_POOL_SIZE) : null;

    if (envMax !== null) {
      const max = envMax;
      const min = envMin !== null ? envMin : Math.max(2, Math.floor(max / 5));
      return { maxPoolSize: max, minPoolSize: min };
    }

    // Dynamic calculation: detect PM2 cluster instances
    let instances = 1;
    if (process.env.instances) {
      if (process.env.instances === 'max') {
        instances = os.cpus().length || 1;
      } else {
        const num = parseInt(process.env.instances, 10);
        if (!isNaN(num) && num > 0) {
          instances = num;
        }
      }
    }

    // Set max connections budget across all instances to 100
    const TOTAL_BUDGET = 100;
    const calculatedMax = Math.max(10, Math.floor(TOTAL_BUDGET / instances));
    const calculatedMin = Math.max(2, Math.floor(calculatedMax / 5));

    logger.info(
      `[DATABASE] Dynamic connection pool: ${instances} instances detected. Configured maxPoolSize=${calculatedMax}, minPoolSize=${calculatedMin}`,
    );

    return { maxPoolSize: calculatedMax, minPoolSize: calculatedMin };
  }

  public getReadyStateName(): string {
    switch (mongoose.connection.readyState) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unknown';
    }
  }

  public getMetrics(): DbMetrics {
    return {
      readyState: mongoose.connection.readyState,
      readyStateName: this.getReadyStateName(),
      maxPoolSize: this.maxPoolSize,
      minPoolSize: this.minPoolSize,
      lastPingSuccess: this.lastPingSuccess,
      lastPingTime: this.lastPingTime ? this.lastPingTime.toISOString() : null,
      pingDurationMs: this.pingDurationMs,
      totalFailedPings: this.totalFailedPings,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public async connect(): Promise<typeof mongoose> {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      logger.error('MONGO_URI is not defined in environment variables');
      process.exit(1);
    }

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    // Production safety: reject localhost/direct MongoDB URIs (require Atlas SRV)
    if (isProduction) {
      if (MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
        logger.error('[DATABASE] CRITICAL: MONGO_URI must not point to localhost in production');
        process.exit(1);
      }
    }

    // Critical Production Data Safety Task:
    // Prevent test, scripts, CI/CD, etc. from ever connecting to the production database.
    const isAtlas = MONGO_URI.includes('mongodb.net');
    if (isAtlas) {
      if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
        logger.error(
          '[DATABASE] CRITICAL FATAL: Tests and CI are strictly prohibited from connecting to MongoDB Atlas production clusters.',
        );
        process.exit(1);
      }

      if (!isProduction && process.env.ALLOW_PROD_DB_LOCAL?.trim() !== 'true') {
        logger.error(
          '[DATABASE] CRITICAL: Accessing Atlas Production cluster from local development is forbidden. Set ALLOW_PROD_DB_LOCAL=true to override.',
        );
        process.exit(1);
      }
    }

    if (process.env.NODE_ENV === 'test') {
      if (!MONGO_URI.toLowerCase().includes('test')) {
        logger.error(
          '[DATABASE] CRITICAL: In test mode, the MONGO_URI database name must contain "test".',
        );
        process.exit(1);
      }
    }

    // Reuse existing connection if ready
    if (mongoose.connection.readyState === 1) {
      logger.info('🟢 [DATABASE] Reusing established MongoDB connection singleton');
      return mongoose;
    }

    // Await existing connection attempt if currently connecting
    if (mongoose.connection.readyState === 2 && this.cachedConnectionPromise) {
      logger.info(
        '🟡 [DATABASE] MongoDB connection already in progress, awaiting existing promise...',
      );
      return this.cachedConnectionPromise;
    }

    const { maxPoolSize, minPoolSize } = this.calculatePoolLimits();
    this.maxPoolSize = maxPoolSize;
    this.minPoolSize = minPoolSize;

    const options: mongoose.ConnectOptions = {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: this.maxPoolSize,
      minPoolSize: this.minPoolSize,
      serverSelectionTimeoutMS: 5000, // Fail fast if database is unreachable
      socketTimeoutMS: 30000, // Clean up hung sockets after 30s
      heartbeatFrequencyMS: 10000, // Perform keep-alive check every 10s
      maxIdleTimeMS: 30000, // Release idle sockets after 30s to conserve database resources
      waitQueueTimeoutMS: 10000, // How long to wait for connection pool slot before failing
      family: 4, // Force IPv4 DNS resolution
      bufferCommands: false, // Disable buffering to fail-fast during transient database issues
      compressors: ['zstd', 'snappy'], // Enable wire protocol network compression
      retryReads: true,
      retryWrites: true,
      serverApi: { version: '1' as const, strict: false, deprecationErrors: true },
    };

    // Register connection lifecycle event listeners
    if (mongoose.connection.listeners('connected').length === 0) {
      mongoose.connection.on('connected', () => {
        logger.info('🟢 [DATABASE] MongoDB connection established');
        this.reconnectAttempts = 0; // Reset reconnect count on successful connection
        this.startHealthCheck(); // Start monitoring health pings

        // Layer 2: Monkey patch dangerous operations on the raw database connection
        if (process.env.NODE_ENV === 'production' && mongoose.connection.db) {
          mongoose.connection.db.dropDatabase = async function (...args) {
            logger.error('[DATABASE] FATAL: Blocked database drop attempt in production!');
            throw new Error('Database drop is strictly prohibited in production.');
          };
          mongoose.connection.db.dropCollection = async function (name: string, ...args) {
            logger.error(
              `[DATABASE] FATAL: Blocked collection drop attempt in production for collection: ${name}!`,
            );
            throw new Error('Collection drop is strictly prohibited in production.');
          };
        }
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`🔴 [DATABASE] MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('🟡 [DATABASE] MongoDB disconnected. Auto-reconnection attempt in progress...');
        this.handleDisconnection();
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('🟢 [DATABASE] MongoDB reconnected successfully');
        this.reconnectAttempts = 0;
      });

      mongoose.connection.on('close', () => {
        logger.info('⚪ [DATABASE] MongoDB connection closed');
        this.stopHealthCheck();
      });
    }

    const maxRetries = 5;

    const attemptConnection = async (attempt: number = 1): Promise<typeof mongoose> => {
      try {
        logger.info(`🔄 [DATABASE] Connecting to MongoDB (Attempt ${attempt}/${maxRetries})...`);
        const conn = await mongoose.connect(MONGO_URI, options);
        logger.info('🚀 [DATABASE] MongoDB Connection Succeeded');
        return conn;
      } catch (err: any) {
        logger.error(`❌ [DATABASE] MongoDB connection attempt ${attempt} failed: ${err.message}`);

        if (attempt === maxRetries) {
          this.cachedConnectionPromise = null; // Reset cached promise on final failure to allow retry triggers later
          throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts.`, {
            cause: err,
          });
        }

        // Exponential backoff with jitter (up to 15s) to prevent thundering herd
        const delay = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
        logger.info(`🔄 [DATABASE] Retrying MongoDB connection in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptConnection(attempt + 1);
      }
    };

    this.cachedConnectionPromise = attemptConnection();
    return this.cachedConnectionPromise;
  }

  /**
   * Handle unexpected disconnections.
   */
  private handleDisconnection() {
    // Monitored by periodic health check
  }

  /**
   * Proactive Health Monitoring Loop.
   * Runs an active ping query every 30 seconds.
   */
  private startHealthCheck() {
    this.stopHealthCheck();

    // Check every 30 seconds
    const intervalMs = 30000;
    this.healthCheckInterval = setInterval(async () => {
      await this.monitorHealth();
    }, intervalMs);

    // Unref the interval so it doesn't keep the process alive
    if (this.healthCheckInterval.unref) {
      this.healthCheckInterval.unref();
    }
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  public async monitorHealth(): Promise<boolean> {
    const startTime = performance.now();
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        this.lastPingSuccess = false;
        this.lastPingTime = new Date();
        this.pingDurationMs = null;
        this.totalFailedPings++;

        logger.warn(
          '[DATABASE] Health check failed: No active connection. Triggering self-healing...',
        );
        this.triggerSelfHealing();
        return false;
      }

      const admin = mongoose.connection.db.admin();
      const result = await Promise.race([
        admin.ping(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 10000)),
      ]);
      const isOk = result && result.ok === 1;

      this.pingDurationMs = Math.round(performance.now() - startTime);
      this.lastPingSuccess = isOk;
      this.lastPingTime = new Date();

      if (!isOk) {
        this.totalFailedPings++;
        logger.warn(
          '[DATABASE] Health check ping returned unhealthy status. Triggering self-healing...',
        );
        this.triggerSelfHealing();
        return false;
      }

      return true;
    } catch (err: any) {
      this.pingDurationMs = null;
      this.lastPingSuccess = false;
      this.lastPingTime = new Date();
      this.totalFailedPings++;

      logger.error('🔴 [DATABASE] Active health ping failed:', err);
      this.triggerSelfHealing();
      return false;
    }
  }

  /**
   * Attempts to self-heal the connection if it fails health checks or gets disconnected.
   */
  private triggerSelfHealing() {
    if (this.isReconnecting) {
      logger.info('🟡 [DATABASE] Self-healing already in progress. Skipping duplicate trigger.');
      return;
    }

    if (mongoose.connection.readyState === 0) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      logger.info(
        `[DATABASE] Self-healing: Connection is disconnected. Attempting to reconnect (Attempt ${this.reconnectAttempts})...`,
      );

      this.cachedConnectionPromise = null;
      this.connect()
        .then(() => {
          this.isReconnecting = false;
        })
        .catch((err) => {
          this.isReconnecting = false;
          logger.error(
            `[DATABASE] Self-healing reconnect attempt ${this.reconnectAttempts} failed: ${err.message}`,
          );
        });
    }
  }

  public async disconnect(): Promise<void> {
    this.stopHealthCheck();
    this.cachedConnectionPromise = null;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

const dbManager = DatabaseManager.getInstance();

export const connectDB = async (): Promise<typeof mongoose> => {
  return dbManager.connect();
};

export const isDbReady = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export const pingDb = async (): Promise<boolean> => {
  return dbManager.monitorHealth();
};

export const getDbMetrics = (): DbMetrics => {
  return dbManager.getMetrics();
};

export default connectDB;
