// Shared Sentry promise — preloaded once, reused everywhere
let _sentryPromise = null;

export function getSentry() {
  if (!_sentryPromise) {
    _sentryPromise = import('@sentry/react').catch(() => null);
  }
  return _sentryPromise;
}

// Kick off preload immediately (will resolve during idle)
if (typeof window !== 'undefined') {
  getSentry();
}
