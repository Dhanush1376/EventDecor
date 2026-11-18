/**
 * Startup bootstrap: start public data requests and warm connections without blocking first render.
 */
import { cmsService } from '../../services/domainServices';
import { getApiOrigin } from '../../config/apiConfig';
import logger from '../core/logger';
import { isPrerendering } from '../performance/prerender';

let bootstrapStarted = false;

const preconnectApi = () => {
  if (isPrerendering()) return;
  try {
    const origin = getApiOrigin();
    if (!origin || document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {
    // VITE_API_URL may be unset in dev — skip
  }
};

export const prefetchCriticalData = () => {
  if (isPrerendering()) return;
  preconnectApi();
  cmsService.getPublished().catch((err) => {
    logger.dev('[Bootstrap] CMS prefetch skipped:', err?.message);
  });
};

export const runAppBootstrap = () => {
  if (bootstrapStarted) return;
  bootstrapStarted = true;

  // Start immediately: the homepage CMS payload is on the critical path to LCP.
  // This is a single network request (no main-thread work worth deferring), and
  // waiting for an idle period used to push it behind React's first render.
  prefetchCriticalData();
};
