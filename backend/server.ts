import './src/config/loadEnv'; // Load & validate environment variables before any other imports resolve!
import app from './src/app';
import connectDB from './src/config/db';
import { ensureIndexes } from './src/config/ensureIndexes';
import logger from './src/config/logger';
import { generateSitemap } from './src/utils/sitemapGenerator';
import { initSocket } from './src/socket';

import mongoose from 'mongoose';

let server: any;

const handleFatalError = async (error: Error, source: string) => {
  logger.error(`🚨 CRITICAL PROCESS ERROR [${source}]: ${error.message}`, { stack: error.stack });
  
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
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
import { initJobs } from './src/jobs/cronJobs';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    if (process.env.SKIP_INDEX_BUILD !== 'true') {
      ensureIndexes()
        .then(() => logger.info('[DATABASE] Background index verification finished'))
        .catch((err) => logger.error('[DATABASE] Background index verification failed:', err));
    } else {
      logger.warn('[DATABASE] SKIP_INDEX_BUILD=true — skipping background index build');
    }

    // Prevent BYPASS_OTP_CODE in production
    if (process.env.NODE_ENV === 'production' && process.env.BYPASS_OTP_CODE) {
      logger.error('CRITICAL: BYPASS_OTP_CODE must not be set in production');
      process.exit(1);
    }

    // 2. Initialize Background Jobs
    initJobs();


      // 3. Start Express Server
      server = app.listen(PORT, () => {
        logger.info(`
          🚀 Server is running in ${process.env.NODE_ENV || 'development'} mode
          📡 Port: ${PORT}
          🏠 URL: http://localhost:${PORT}
          🏥 Health Check: http://localhost:${PORT}/api/health
        `);

        // Initialize Socket.io
        initSocket(server);

        // Auto-generate sitemap on boot in the background
        generateSitemap().catch((err: any) => logger.error(`[BOOT SITEMAP] Initial generation failed: ${err.message}`));
      });

    // 4. Graceful Shutdown Handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed.');
        
        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during MongoDB closure:', err);
          process.exit(1);
        }
      });

      // Force shutdown if it takes too long
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
