import { useState, useEffect } from 'react';
import { useNetwork } from '../../context/NetworkContext';

/**
 * Non-blocking banner when the API is slow or offline — keeps the UI usable.
 */
export function SlowConnectionBanner() {
  const { networkState, connectionQuality } = useNetwork();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Show banner on state changes
    setVisible(true);

    // Auto-hide the banner after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [networkState, connectionQuality]);

  if (!visible || (networkState === 'online' && connectionQuality !== 'poor')) {
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
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-max max-w-[90vw] z-[9998] px-6 py-3 bg-black/90 backdrop-blur-md border border-white/10 text-white rounded-full text-center text-[10px] tracking-widest uppercase font-bold shadow-2xl flex items-center gap-3"
    >
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      {message}
    </div>
  );
}
