import logger from '../config/logger';

export type CdnHealth = 'up' | 'down' | 'not_configured';

let cachedStatus: CdnHealth | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 300000; // 5 minutes (increased to prevent resource drain)

/**
 * HEAD request to Cloudinary CDN — used in /api/health and weekly cron.
 */
export const checkCloudinaryCdn = async (): Promise<CdnHealth> => {
  const now = Date.now();
  if (cachedStatus && (now - lastCheckTime < CACHE_TTL_MS)) {
    return cachedStatus;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    cachedStatus = 'not_configured';
    lastCheckTime = now;
    return 'not_configured';
  }

  const probeUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_10,q_auto/sample.jpg`;

  try {
    const res = await fetch(probeUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    // Cloudinary might return 400 for HEAD if unsigned or 404 if sample.jpg is missing, 
    // but the CDN is still up. Treat 200, 400, 403, 404 as "up" for network connectivity.
    if (res.status >= 200 && res.status < 500) {
      cachedStatus = 'up';
    } else {
      cachedStatus = 'down';
    }
    lastCheckTime = Date.now();
    return cachedStatus;
  } catch (err) {
    logger.warn('[CDN HEALTH] Cloudinary probe failed (network or timeout):', err);
    cachedStatus = 'down';
    lastCheckTime = Date.now();
    return 'down';
  }
};
