import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { initAnalytics } from "./utils/analytics";
import { initObservability } from "./utils/observability";
import { MARBLE_TEXTURE_URL } from "./constants/assets";

import logger from './utils/logger';

document.documentElement.style.setProperty(
  '--marble-texture-url',
  `url("${MARBLE_TEXTURE_URL}")`
);
// Initialize observability monitoring layers (Sentry & LogRocket)
initObservability();

// Initialize analytics (consent-aware — won't fire without user consent)
initAnalytics();

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
      window.location.reload();
    }
  }
}, true); // Use capture phase to catch resource load errors

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
