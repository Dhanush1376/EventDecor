/**
 * Post-paint bootstrap: prefetch public data and warm connections without blocking first render.
 */
import { cmsService } from '../services/domainServices';
import { getApiUrl, getApiOrigin } from '../config/apiConfig';
import logger from './logger';
import { purgeLegacyClientStorage } from './purgeLegacyStorage';
import { isPrerendering } from './prerender';

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

  purgeLegacyClientStorage();

  const run = () => prefetchCriticalData();

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 150);
  }
};
