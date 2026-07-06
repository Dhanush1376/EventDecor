// Shared Sentry promise. Keep Sentry out of startup; load it only when an error
// is captured or the deferred observability bootstrap runs.
let _sentryPromise = null;

export function getSentry() {
  if (!_sentryPromise) {
    _sentryPromise = import('@sentry/react').catch(() => null);
  }
  return _sentryPromise;
}
