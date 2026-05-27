import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';
import logger from './logger';
import { hasAnalyticsConsent } from './analytics';

const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

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

/**
 * Bootstraps enterprise frontend observability layers (Sentry & LogRocket).
 */
export const initObservability = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const logRocketId = import.meta.env.VITE_LOGROCKET_ID;

  if (logRocketId && hasAnalyticsConsent()) {
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
  }

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: isProduction ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE || 'development',
    });

    if (logRocketId) {
      linkLogRocketToSentry();
    }
  }
};

export const linkLogRocketToSentry = () => {
  if (!import.meta.env.VITE_LOGROCKET_ID || !import.meta.env.VITE_SENTRY_DSN) return;

  LogRocket.getSessionURL((sessionURL) => {
    if (!sessionURL) return;
    Sentry.setExtra('sessionURL', sessionURL);
    Sentry.setExtra('logrocketSessionURL', sessionURL);
    Sentry.setContext('logrocket', { sessionURL });
  });
};

export const captureException = (error, context = {}) => {
  logger.error('[Observability Exception]:', error, context);

  if (import.meta.env.VITE_LOGROCKET_ID && import.meta.env.VITE_SENTRY_DSN) {
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
    return;
  }

  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: redactObject(context) });
  }

  if (import.meta.env.VITE_LOGROCKET_ID) {
    LogRocket.captureException(error, { extra: redactObject(context) });
  }
};

export { linkLogRocketToSentry as syncLogRocketSessionToSentry };

export const setUserContext = (user) => {
  if (!user) {
    if (import.meta.env.VITE_SENTRY_DSN) Sentry.setUser(null);
    return;
  }

  const identity = {
    id: user._id || user.id,
    email: user.email,
    role: user.role || 'customer',
  };

  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(identity);
  }

  if (import.meta.env.VITE_LOGROCKET_ID) {
    LogRocket.identify(identity.id, {
      name: user.name || user.email.split('@')[0],
      email: identity.email,
      role: identity.role,
    });
  }
};
