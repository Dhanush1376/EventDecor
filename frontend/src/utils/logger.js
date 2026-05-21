/**
 * Production-Safe Logger Utility
 * ==============================
 * Provides structured logging that is automatically silenced in production builds.
 * 
 * - In development (import.meta.env.DEV === true): All levels output to console.
 * - In production: Only `error` is forwarded to Sentry/observability. All others are silenced.
 * 
 * Usage:
 *   import logger from '@/utils/logger';
 *   logger.info('User loaded', { userId: 123 });
 *   logger.warn('Deprecated API used');
 *   logger.error('Payment failed', error);
 *   logger.dev('Debug-only trace', someData);  // Always silent in production
 */

const isDev = import.meta.env.DEV;

const noop = () => {};

/**
 * Forward critical errors to Sentry if available, even in production.
 */
const reportToSentry = (message, ...args) => {
  try {
    if (typeof window !== 'undefined' && window.__SENTRY_INITIALIZED__) {
      const Sentry = require('@sentry/react');
      const error = args[0] instanceof Error ? args[0] : new Error(String(message));
      Sentry.captureException(error);
    }
  } catch {
    // Sentry not available — fail silently
  }
};

const logger = {
  /**
   * General informational messages. Silent in production.
   */
  info: isDev ? console.info.bind(console) : noop,

  /**
   * Warning messages for non-critical issues. Silent in production.
   */
  warn: isDev ? console.warn.bind(console) : noop,

  /**
   * Error messages. In production, these are forwarded to Sentry.
   * In development, they are logged to the console.
   */
  error: isDev
    ? console.error.bind(console)
    : (message, ...args) => {
        reportToSentry(message, ...args);
      },

  /**
   * Development-only debug trace. Always silent in production.
   */
  dev: isDev ? console.log.bind(console) : noop,

  /**
   * Debug-level messages. Silent in production.
   */
  debug: isDev ? console.debug.bind(console) : noop,
};

export default logger;
