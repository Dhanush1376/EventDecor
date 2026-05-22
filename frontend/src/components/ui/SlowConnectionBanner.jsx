import React from 'react';
import { useNetwork } from '../../context/NetworkContext';

/**
 * Non-blocking banner when the API is slow or offline — keeps the UI usable.
 */
export function SlowConnectionBanner() {
  const { networkState, connectionQuality } = useNetwork();

  if (networkState === 'online' && connectionQuality !== 'poor') {
    return null;
  }

  const message =
    networkState === 'offline'
      ? 'You appear to be offline. Some actions will sync when you reconnect.'
      : networkState === 'reconnecting'
        ? 'Reconnecting to the studio…'
        : 'Connection is slow. Content may take a moment to load.';

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[9998] px-4 py-2 bg-amber-50 border-b border-amber-200/80 text-amber-950 text-center text-xs tracking-wide"
    >
      {message}
    </div>
  );
}
