import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { MARBLE_TEXTURE_URL } from "./constants/assets";
import { runAppBootstrap } from "./utils/bootstrap";

import logger from './utils/logger';

document.documentElement.style.setProperty(
  '--marble-texture-url',
  `url("${MARBLE_TEXTURE_URL}")`
);

// Defer non-critical monitoring and analytics until after first paint
const deferNonCriticalInit = () => {
  import('./utils/observability').then(({ initObservability }) => initObservability()).catch(() => {});
  import('./utils/analytics').then(({ initAnalytics }) => initAnalytics()).catch(() => {});
};

if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(deferNonCriticalInit, { timeout: 4000 });
} else {
  setTimeout(deferNonCriticalInit, 1);
}

runAppBootstrap();

// ─── Global Error Handler for Outdated Bundles (Chunk Loading Errors) ───
window.addEventListener('error', (event) => {
  const isChunkError = 
    event.message?.includes('Loading chunk') || 
    event.message?.includes('Failed to fetch dynamically imported module');
  
  if (isChunkError) {
    logger.warn('[Observability] Detected chunk loading error. Attempting automatic reload...');
    const lastReload = sessionStorage.getItem('siri_chunk_reload_time');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('siri_chunk_reload_time', String(now));
      
      // Unregister service workers first to bypass PWA cache
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('v', Date.now().toString());
      window.location.href = currentUrl.toString();
    }
  }
}, true); // Use capture phase to catch resource load errors

const rootEl = document.getElementById("root");
const shellEl = document.getElementById("app-shell");

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

if (shellEl) {
  shellEl.remove();
}
