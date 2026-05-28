import './src/config/loadEnv'; // Load & validate environment variables before any other imports resolve!
import { auditEnvOnStartup } from './src/config/secretAudit';
auditEnvOnStartup();
import { runStartupValidation } from './src/config/startupValidator';
runStartupValidation();
import app from './src/app';
import connectDB from './src/config/db';
import { ensureIndexes } from './src/config/ensureIndexes';
import logger from './src/config/logger';
import { generateSitemap } from './src/utils/sitemapGenerator';
import { initSocket, getIO } from './src/socket';
import { initJobs } from './src/jobs/cronJobs';
import { initRedis, closeRedisConnections } from './src/utils/redis';
import { initWorkers, closeWorkers } from './src/jobs/workers';
import { initQueues, closeQueues } from './src/jobs/queues';
import { initRecommendationSystem } from './src/services/recommendation/recommendationEngine';

import * as Sentry from '@sentry/node';
import mongoose from 'mongoose';

import { Server } from 'http';

let server: Server;

const handleFatalError = async (error: Error, source: string) => {
  logger.error(`🚨 CRITICAL PROCESS ERROR [${source}]: ${error.message}`, { stack: error.stack });
  
  if (process.env.SENTRY_DSN) {
    try {
      Sentry.captureException(error);
    } catch {
      // Ignored if sentry loading fails
    }
  }

  if (server) {
    try {
      server.close(() => {
        logger.info('HTTP server closed on critical process crash.');
      });
    } catch (err) {
      logger.error('Failed to close HTTP server during critical crash:', err);
    }
  }

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed on critical process crash.');
    }
  } catch (err) {
    logger.error('Failed to close MongoDB during critical crash:', err);
  }

  // Allow log buffers and sentry traces 1 second to flush, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};

process.on('uncaughtException', (err) => {
  handleFatalError(err, 'uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  handleFatalError(error, 'unhandledRejection');
});


const PORT = parseInt(process.env.PORT || '5000', 10);

const initializeServicesProgressively = async (httpServer: Server) => {
  try {
    const bootStartTime = performance.now();
    // 1. Connect to Database (retry internally, throw if fails)
    logger.info('[STARTUP] Progressive Init: Connecting to MongoDB...');
    await connectDB();
    logger.info('🟢 [STARTUP] MongoDB connected successfully');

    // 2. Build indexes in background
    if (process.env.SKIP_INDEX_BUILD !== 'true') {
      ensureIndexes()
        .then(() => logger.info('[DATABASE] Background index verification finished'))
        .catch((err) => {
          logger.error('[DATABASE] CRITICAL ALERT: Background index verification failed!', err);
          if (process.env.SENTRY_DSN) Sentry.captureException(err);
        });
    } else {
      logger.warn('[DATABASE] SKIP_INDEX_BUILD=true — skipping background index build');
    }

    // 3. Initialize Redis (graceful fallback if REQUIRE_REDIS=false)
    logger.info('[STARTUP] Progressive Init: Initializing Redis...');
    let redisReady = false;
    try {
      await initRedis();
      redisReady = true;
      logger.info('🟢 [STARTUP] Redis initialized successfully');
    } catch (err: any) {
      logger.error(`❌ [REDIS] Initialization error: ${err.message}`);
      if (process.env.REQUIRE_REDIS === 'true') {
        throw new Error(`CRITICAL: Redis is required but failed to initialize: ${err.message}`);
      }
    }

    // 4. Initialize Socket.io (now that Redis connection is ready or failed, it can bind its adapter)
    try {
      initSocket(httpServer);
      logger.info('🟢 [STARTUP] Socket.io initialized successfully');
    } catch (err: any) {
      logger.error(`❌ [SOCKET.IO] Initialization error: ${err.message}`);
    }

    // 5. Initialize BullMQ Queues and Workers
    if (redisReady || process.env.REQUIRE_REDIS !== 'true') {
      try {
        await initQueues();
        await initWorkers();
        logger.info('🟢 [STARTUP] BullMQ queues and workers initialized');
      } catch (err: any) {
        logger.error(`❌ [BULLMQ] Initialization error: ${err.message}`);
        if (process.env.REQUIRE_REDIS === 'true') {
          throw err;
        }
      }
    }

    // 6. Initialize Recommendation System (warm caches — non-blocking, non-fatal)
    initRecommendationSystem().catch((err: any) => {
      logger.warn(`⚠️ [RECO] Recommendation system init skipped: ${err.message}`);
    });

    // 7. Initialize Background Cron/Jobs
    try {
      initJobs();
      logger.info('🟢 [STARTUP] Background cron/jobs initialized');
    } catch (err: any) {
      logger.error(`❌ [STARTUP] Jobs initialization error: ${err.message}`);
    }

    // 8. Auto-generate sitemap
    generateSitemap().catch((err: any) => 
      logger.error(`[BOOT SITEMAP] Initial sitemap generation failed: ${err.message}`)
    );

    const bootEndTime = performance.now();
    logger.info(`⚡ [STARTUP] Progressive boot sequence completed in ${((bootEndTime - bootStartTime) / 1000).toFixed(2)}s`);

  } catch (error: any) {
    logger.error('🚨 CRITICAL SERVICE INITIALIZATION ERROR:', error);
    // Trigger fatal error shutdown handling
    handleFatalError(error, 'progressiveInitialization');
  }
};

const startServer = async () => {
  try {
    // Prevent BYPASS_OTP_CODE in production (Checked early)
    if (process.env.NODE_ENV === 'production' && process.env.BYPASS_OTP_CODE) {
      logger.error('CRITICAL: BYPASS_OTP_CODE must not be set in production');
      process.exit(1);
    }

    // 1. Start Express Server Immediately
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(
        `🚀 [STARTUP] Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`
      );
      if (typeof process.send === 'function') {
        process.send('ready');
      }

      // Kick off background initialization AFTER port is bound
      initializeServicesProgressively(server);
    });

    // 1b. Prevent Slowloris and resource exhaustion attacks
    // Ensure timeout is slightly higher than the load balancer's timeout (Render has 100s default, but 65s is safe for internal)
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds




    // 5. Graceful Shutdown Handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Force shutdown if it takes too long
      const forceTimeout = setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
      forceTimeout.unref();

      try {
        // 1. Close Socket.io connections first
        try {
          const io = getIO();
          io.close();
          logger.info('Socket.io connections closed.');
        } catch {
          // Socket.io may not be initialized
        }

        // 2. Stop accepting new HTTP connections
        await new Promise<void>((resolve) => {
          server.close(() => {
            logger.info('HTTP server closed.');
            resolve();
          });
        });

        // 3. Close Redis connections
        await closeWorkers();
        await closeQueues();
        await closeRedisConnections();

        // 4. Close MongoDB connection
        await mongoose.connection.close();
        logger.info('MongoDB connection closed.');

        clearTimeout(forceTimeout);
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
