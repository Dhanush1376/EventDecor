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
    });
    console.log('📡 LogRocket observability layer loaded.');
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

    // 3. Coordinate LogRocket session links within Sentry alerts
    if (logRocketId) {
      LogRocket.getSessionURL((sessionURL) => {
        Sentry.setExtra('logrocketSessionURL', sessionURL);
      });
    }

    console.log('🛡️ Sentry error monitoring layer loaded.');
  }
};

/**
 * Transmits caught errors safely to Sentry and LogRocket.
 */
export const captureException = (error, context = {}) => {
  console.error('[Observability Exception]:', error, context);
  
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  
  if (import.meta.env.VITE_LOGROCKET_ID) {
    LogRocket.captureException(error, { extra: context });
  }
};

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
