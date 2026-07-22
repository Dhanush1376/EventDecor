import { lazy } from 'react';

/**
 * Wraps React.lazy() to automatically retry loading a chunk if it fails (usually due to a new deployment).
 * This prevents the "Failed to fetch dynamically imported module" error by forcing a hard reload
 * to grab the new JS bundle from the server.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const lastReload = window.sessionStorage.getItem('siri_chunk_reload_time');
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        // Assume that the error is due to a new deploy (changed chunk hashes)
        window.sessionStorage.setItem('siri_chunk_reload_time', String(now));

        // Unregister service workers first to prevent them from intercepting the reload and serving old cached index.html
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
          });
        }

        // Reloading the page forces the browser to download the new index.html with new JS hashes.
        // We use cache-busting query parameter to ensure we don't load the cached index.html
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('v', Date.now().toString());
        window.location.href = currentUrl.toString();

        // Return a never-resolving promise so React doesn't crash before the reload happens
        return new Promise(() => {});
      }

      // The page has already been reloaded recently, so throw the error to be caught by the ErrorBoundary
      throw error;
    }
  });
