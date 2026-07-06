import logger from '../core/logger';
import { hasAnalyticsConsent } from '../core/analytics';

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
const LOGROCKET_SESSION_SAMPLE_RATE = Number(
  import.meta.env.VITE_LOGROCKET_SESSION_SAMPLE_RATE || (isProduction ? 0.02 : 0),
);

const SENSITIVE_KEY = /password|otp|token|secret|cvv|card|razorpay|authorization/i;

const redactValue = (value) => {
  if (value == null) return value;
  if (typeof value === 'string') return '[REDACTED]';
  if (Array.isArray(value)) return value.map(() => '[REDACTED]');
  if (typeof value === 'object') return redactObject(value);
  return '[REDACTED]';
};

const redactObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactObject(item));
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactObject(value);
  }
  return out;
};

let sentryPromise = null;
let logRocketPromise = null;
let sentryClient = null;
let logRocketClient = null;
let logRocketEnabled = false;

const getSentryClient = () => {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react').then((module) => {
      sentryClient = module;
      return module;
    });
  }
  return sentryPromise;
};

const getLogRocketClient = () => {
  if (!logRocketPromise) {
    logRocketPromise = import('logrocket').then((module) => {
      logRocketClient = module.default || module;
      return logRocketClient;
    });
  }
  return logRocketPromise;
};

const shouldStartLogRocket = () => {
  if (!isProduction && import.meta.env.VITE_ENABLE_LOGROCKET_DEV !== 'true') return false;
  if (!hasAnalyticsConsent()) return false;
  if (import.meta.env.VITE_LOGROCKET_FORCE === 'true') return true;
  return Math.random() < LOGROCKET_SESSION_SAMPLE_RATE;
};

/**
 * Bootstraps enterprise frontend observability layers (Sentry & LogRocket).
 */
export const initObservability = async () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const logRocketId = import.meta.env.VITE_LOGROCKET_ID;

  if (logRocketId && shouldStartLogRocket()) {
    const LogRocket = await getLogRocketClient();
    LogRocket.init(logRocketId, {
      shouldCaptureIP: false,
      dom: {
        inputSanitizer: true,
        textSanitizer: true,
        privateAttributeBlocklist: ['data-private', 'data-logrocket-private'],
      },
      console: {
        shouldAggregateConsoleErrors: true,
      },
      network: {
        requestSanitizer: (request) => ({
          ...request,
          headers: redactObject(request.headers),
          body: request.body != null ? redactValue(request.body) : request.body,
        }),
        responseSanitizer: (response) => ({
          ...response,
          body: response.body != null ? redactObject(response.body) : response.body,
        }),
      },
    });
    logRocketEnabled = true;
  }

  if (sentryDsn) {
    const Sentry = await getSentryClient();
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: Number(
        import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || (isProduction ? 0.05 : 0),
      ),
      replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE || 0),
      replaysOnErrorSampleRate: Number(
        import.meta.env.VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE || (isProduction ? 0.05 : 0),
      ),
      environment: import.meta.env.MODE || 'development',
    });

    if (logRocketEnabled) {
      linkLogRocketToSentry();
    }
  }
};

export const linkLogRocketToSentry = async () => {
  if (!logRocketEnabled || !import.meta.env.VITE_SENTRY_DSN) return;

  const [LogRocket, Sentry] = await Promise.all([getLogRocketClient(), getSentryClient()]);
  LogRocket.getSessionURL((sessionURL) => {
    if (!sessionURL) return;
    Sentry.setExtra('sessionURL', sessionURL);
    Sentry.setExtra('logrocketSessionURL', sessionURL);
    Sentry.setContext('logrocket', { sessionURL });
  });
};

export const captureException = (error, context = {}) => {
  logger.error('[Observability Exception]:', error, context);

  if (logRocketEnabled && import.meta.env.VITE_SENTRY_DSN) {
    Promise.all([getLogRocketClient(), getSentryClient()])
      .then(([LogRocket, Sentry]) => {
        LogRocket.getSessionURL((sessionURL) => {
          if (sessionURL) {
            Sentry.withScope((scope) => {
              scope.setExtra('sessionURL', sessionURL);
              scope.setExtra('logrocketSessionURL', sessionURL);
              scope.setContext('logrocket', { sessionURL });
              Sentry.captureException(error, { extra: redactObject(context) });
            });
            return;
          }
          Sentry.captureException(error, { extra: redactObject(context) });
        });
      })
      .catch(() => {});
    return;
  }

  if (import.meta.env.VITE_SENTRY_DSN) {
    getSentryClient()
      .then((Sentry) => Sentry.captureException(error, { extra: redactObject(context) }))
      .catch(() => {});
  }

  if (logRocketEnabled) {
    getLogRocketClient()
      .then((LogRocket) => LogRocket.captureException(error, { extra: redactObject(context) }))
      .catch(() => {});
  }
};

export { linkLogRocketToSentry as syncLogRocketSessionToSentry };

export const setUserContext = (user) => {
  if (!user) {
    if (sentryClient) sentryClient.setUser(null);
    return;
  }

  const identity = {
    id: user._id || user.id,
    email: user.email,
    role: user.role || 'customer',
  };

  if (sentryClient) {
    sentryClient.setUser(identity);
  }

  if (logRocketEnabled && logRocketClient) {
    logRocketClient.identify(identity.id, {
      name: user.name || user.email.split('@')[0],
      email: identity.email,
      role: identity.role,
    });
  }
};
