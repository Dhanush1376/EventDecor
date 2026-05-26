import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { runAppBootstrap } from "./utils/bootstrap";
import { getApiRootUrl } from "./config/apiConfig";
import { logStartupDiagnostics } from "./utils/diagnostics";
import { isPrerendering } from "./utils/prerender";

import logger from './utils/logger';



// Defer non-critical monitoring and analytics until after first paint
const deferNonCriticalInit = () => {
  if (isPrerendering()) return; // skip analytics when pre-rendering
  import('./utils/observability').then(({ initObservability }) => initObservability()).catch(() => {});
  import('./utils/analytics').then(({ initAnalytics }) => initAnalytics()).catch(() => {});
};

if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(deferNonCriticalInit, { timeout: 4000 });
} else {
  setTimeout(deferNonCriticalInit, 1);
}

if (!isPrerendering()) {
  runAppBootstrap();
  logStartupDiagnostics();
}

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

// ─── Pre-warm backend (Render cold start) ───
const warmBackend = () => {
  const root = getApiRootUrl();
  const healthUrl = root.startsWith('/')
    ? `${root}/readiness`
    : `${root}/readiness`;
    
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  fetch(`${healthUrl}?t=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
    signal: controller.signal
  })
  .then(() => clearTimeout(timeoutId))
  .catch((err) => {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      logger.warn('Backend cold start ping timed out. Consider setting up a cron job (e.g. cron-job.org) to keep the Render service awake.');
    }
  });
};
if (!isPrerendering()) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(warmBackend, { timeout: 3000 });
  } else {
    setTimeout(warmBackend, 100);
  }
}

const rootEl = document.getElementById("root");
const shellEl = document.getElementById("app-shell");

// The raw index.html has an app-shell inside #root. If it's still there, we haven't been pre-rendered by react-snap.
const isPrerendered = rootEl.hasChildNodes() && (!shellEl || shellEl.parentElement !== rootEl);

if (isPrerendered) {
  hydrateRoot(
    rootEl,
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Fallback to ensure loader is removed even if React suspends indefinitely
setTimeout(() => {
  const shell = document.getElementById("app-shell");
  if (shell) {
    shell.style.transition = 'opacity 0.5s ease-out';
    shell.style.opacity = '0';
    setTimeout(() => shell.remove(), 500);
  }
}, 5000);

if (shellEl) {
  // Hide it immediately if rendering succeeds
  shellEl.style.display = 'none';
}
