/**
 * Production-safe logger with structured diagnostics.
 */
import { getApiConfig } from '../../config/apiConfig';

const isDev = import.meta.env.DEV;

const noop = () => {};

const reportToSentry = (message, ...args) => {
  try {
    if (typeof window !== 'undefined' && window.__SENTRY_INITIALIZED__) {
      import('@sentry/react')
        .then((Sentry) => {
          const error = args[0] instanceof Error ? args[0] : new Error(String(message));
          Sentry.captureException(error);
        })
        .catch(() => {
          // Sentry not loaded
        });
    }
  } catch {
    // Sentry not available
  }
};

const withContext =
  (level, fn) =>
  (...args) => {
    const config = getApiConfig();
    fn(`[${config.deployVersion}]`, ...args);
  };

const logger = {
  info: isDev
    ? withContext('info', console.info.bind(console))
    : (...args) => {
        if (typeof window !== 'undefined' && window.__SIRI_DEBUG__) {
          console.info('[Siri]', ...args);
        }
      },

  warn: isDev
    ? withContext('warn', console.warn.bind(console))
    : (...args) => {
        console.warn('[Siri]', ...args);
      },

  error: isDev
    ? withContext('error', console.error.bind(console))
    : (message, ...args) => {
        console.error('[Siri]', message, ...args);
        reportToSentry(message, ...args);
      },

  dev: isDev ? withContext('dev', console.log.bind(console)) : noop,

  debug: isDev ? withContext('debug', console.debug.bind(console)) : noop,
};

export default logger;
