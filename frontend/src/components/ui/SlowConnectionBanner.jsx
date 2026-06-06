import { useEffect, useRef } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import toast from 'react-hot-toast';

/**
 * Non-blocking banner when the API is slow or offline — integrated with global toaster.
 */
export function SlowConnectionBanner() {
  const { networkState, connectionQuality } = useNetwork();
  const lastState = useRef({ networkState: 'online', connectionQuality: 'good' });

  useEffect(() => {
    const stateChanged =
      lastState.current.networkState !== networkState ||
      lastState.current.connectionQuality !== connectionQuality;

    if (!stateChanged) return;
    lastState.current = { networkState, connectionQuality };

    if (networkState === 'offline') {
      toast.error('You appear to be offline. Actions will sync on reconnect.', {
        id: 'network-toast',
        duration: 2500,
      });
    } else if (networkState === 'reconnecting') {
      toast.loading('Reconnecting to the studio…', {
        id: 'network-toast',
        duration: 2000,
      });
    } else if (networkState === 'online' && connectionQuality === 'poor') {
      toast.error('Connection is slow. Content may take a moment to load.', {
        id: 'network-toast',
        duration: 2500,
      });
    } else if (networkState === 'online' && lastState.current.networkState !== 'online') {
      toast.success('We are back online!', {
        id: 'network-toast',
        duration: 2000,
      });
    }
  }, [networkState, connectionQuality]);

  return null;
}
