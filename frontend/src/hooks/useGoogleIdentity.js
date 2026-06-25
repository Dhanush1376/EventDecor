import { useState, useEffect, useCallback, useRef } from 'react';
import logger from '../utils/core/logger';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Module-level script loading state to prevent duplicate loads across hook instances
let gsiScriptLoadPromise = null;
let gsiScriptLoaded = false;

function loadGsiScript() {
  if (gsiScriptLoaded) return Promise.resolve();
  if (gsiScriptLoadPromise) return gsiScriptLoadPromise;

  gsiScriptLoadPromise = new Promise((resolve, reject) => {
    // Check if already injected
    if (document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`)) {
      if (window.google?.accounts?.id) {
        gsiScriptLoaded = true;
        resolve();
        return;
      }
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gsiScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      gsiScriptLoadPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });

  return gsiScriptLoadPromise;
}

/**
 * Custom hook to manage Google Identity Services (GSI) SDK.
 * Loads the script, initializes the client, and provides a method to trigger login.
 *
 * @param {Function} onSuccess - Callback with the credential response from Google
 * @param {Function} [onError] - Optional error callback
 * @returns {{ isReady: boolean, triggerLogin: Function, error: string|null }}
 */
export function useGoogleIdentity(onSuccess, onError) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const initializedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Keep refs updated without re-initializing
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      logger.warn('[GoogleIdentity] VITE_GOOGLE_CLIENT_ID is not configured');
      setError('Google Sign-In is not configured');
      return;
    }

    if (initializedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGsiScript();

        if (cancelled) return;

        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity Services not available after script load');
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              onSuccessRef.current?.(response);
            } else {
              onErrorRef.current?.('Google sign-in returned no credential');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });

        initializedRef.current = true;
        setIsReady(true);
        logger.info('[GoogleIdentity] SDK initialized successfully');
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || 'Failed to initialize Google Sign-In';
        logger.error('[GoogleIdentity] Init error:', msg);
        setError(msg);
        onErrorRef.current?.(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const triggerLogin = useCallback(() => {
    if (!isReady || !window.google?.accounts?.id) {
      logger.warn('[GoogleIdentity] triggerLogin called but SDK not ready');
      return;
    }

    // Use prompt() for One Tap / popup flow.
    // We pass no callback here because Google FedCM deprecates UI status methods.
    window.google.accounts.id.prompt();
  }, [isReady]);

  const renderGoogleButton = useCallback(
    (elementId) => {
      if (!isReady || !window.google?.accounts?.id) {
        logger.warn('[GoogleIdentity] renderGoogleButton called but SDK not ready');
        return;
      }
      const btnElement = document.getElementById(elementId);
      if (btnElement) {
        window.google.accounts.id.renderButton(btnElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    },
    [isReady],
  );

  return { isReady, triggerLogin, renderGoogleButton, error };
}
// Force HMR reload
