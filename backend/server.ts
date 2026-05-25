import './src/config/loadEnv'; // Load & validate environment variables before any other imports resolve!
import app from './src/app';
import connectDB from './src/config/db';
import { ensureIndexes } from './src/config/ensureIndexes';
import logger from './src/config/logger';
import { generateSitemap } from './src/utils/sitemapGenerator';
import { initSocket, getIO } from './src/socket';
import { initJobs } from './src/jobs/cronJobs';
import { initRedis, closeRedisConnections } from './src/utils/redis';
import { closeWorkers } from './src/jobs/workers';
import { closeQueues } from './src/jobs/queues';

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

const startServer = async () => {
  try {
    // 1. Start Express Server FIRST so health checks pass immediately
    server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(
          `[STARTUP] Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`
        );
        if (typeof process.send === 'function') {
          process.send('ready');
        }
      });

    // 4. Initialize Redis Connection BEFORE Sockets (otherwise pub/sub clients are null)
    logger.info('Initializing Redis...');
    await initRedis().catch(err => logger.error(`[REDIS] Initialization error: ${err.message}`));

    // Initialize Socket.io after server is listening and Redis is ready
    initSocket(server);

    // Prevent BYPASS_OTP_CODE in production
    if (process.env.NODE_ENV === 'production' && process.env.BYPASS_OTP_CODE) {
      logger.error('CRITICAL: BYPASS_OTP_CODE must not be set in production');
      process.exit(1);
    }

    // 2. Connect to Database asynchronously in the background
    connectDB().then(() => {
      if (process.env.SKIP_INDEX_BUILD !== 'true') {
        ensureIndexes()
          .then(() => logger.info('[DATABASE] Background index verification finished'))
          .catch((err) => {
            logger.error('[DATABASE] CRITICAL ALERT: Background index verification failed! Database performance will degrade to full collection scans:', err);
            if (process.env.SENTRY_DSN) Sentry.captureException(err);
          });
      } else {
        logger.warn('[DATABASE] SKIP_INDEX_BUILD=true — skipping background index build');
      }

      // 3. Initialize Background Jobs AFTER DB is connected
      initJobs();

      // Auto-generate sitemap AFTER DB is connected
      generateSitemap().catch((err: any) => logger.error(`[BOOT SITEMAP] Initial generation failed: ${err.message}`));
      
    }).catch((err) => {
      logger.error(`[DATABASE] Unrecoverable connection error during startup: ${err.message}`);
    });



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
