import { lazy } from "react";

/**
 * Wraps React.lazy() to automatically retry loading a chunk if it fails (usually due to a new deployment).
 * This prevents the "Failed to fetch dynamically imported module" error by forcing a hard reload
 * to grab the new JS bundle from the server.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem("page-has-been-force-refreshed") || "false"
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem("page-has-been-force-refreshed", "false");
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error is due to a new deploy (changed chunk hashes)
        window.sessionStorage.setItem("page-has-been-force-refreshed", "true");
        // Reloading the page forces the browser to download the new index.html with new JS hashes
        window.location.reload();
        // Return a never-resolving promise so React doesn't crash before the reload happens
        return new Promise(() => {});
      }
      
      // The page has already been reloaded, so throw the error to be caught by the ErrorBoundary
      throw error;
    }
  });
