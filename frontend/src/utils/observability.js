import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';

// Helper to determine active production state
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

/**
 * Bootstraps enterprise frontend observability layers (Sentry & LogRocket).
 * Binds both monitoring streams together for coordinated session tracing.
 */
export const initObservability = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const logRocketId = import.meta.env.VITE_LOGROCKET_ID;

  // 1. Initialize LogRocket session recording
  if (logRocketId) {
    LogRocket.init(logRocketId, {
      shouldCaptureIP: false, // Privacy first
      dom: {
        inputSanitizer: true, // Scrub PII from form inputs
      },
    });
  }

  // 2. Initialize Sentry error reporting
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
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

/** Attach LogRocket replay URL to Sentry for error/session correlation. */
export const linkLogRocketToSentry = () => {
  if (!import.meta.env.VITE_LOGROCKET_ID || !import.meta.env.VITE_SENTRY_DSN) return;

  LogRocket.getSessionURL((sessionURL) => {
    if (!sessionURL) return;
    Sentry.setExtra('sessionURL', sessionURL);
    Sentry.setExtra('logrocketSessionURL', sessionURL);
    Sentry.setContext('logrocket', { sessionURL });
  });
};

/**
 * Transmits caught errors safely to Sentry and LogRocket.
 */
export const captureException = (error, context = {}) => {
  console.error('[Observability Exception]:', error, context);

  if (import.meta.env.VITE_LOGROCKET_ID && import.meta.env.VITE_SENTRY_DSN) {
    LogRocket.getSessionURL((sessionURL) => {
      if (sessionURL) {
        Sentry.withScope((scope) => {
          scope.setExtra('sessionURL', sessionURL);
          scope.setExtra('logrocketSessionURL', sessionURL);
          scope.setContext('logrocket', { sessionURL });
          Sentry.captureException(error, { extra: context });
        });
        return;
      }
      Sentry.captureException(error, { extra: context });
    });
    return;
  }

  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  
  if (import.meta.env.VITE_LOGROCKET_ID) {
    LogRocket.captureException(error, { extra: context });
  }
};

// Alias for audit compatibility
export { linkLogRocketToSentry as syncLogRocketSessionToSentry };

/**
 * Pins current session identifiers to authenticated user parameters.
 */
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
