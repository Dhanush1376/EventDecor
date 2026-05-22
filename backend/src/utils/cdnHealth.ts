import logger from '../config/logger';

export type CdnHealth = 'up' | 'down' | 'not_configured';

let cachedStatus: CdnHealth | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60000;

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
    const res = await fetch(probeUrl, { method: 'HEAD', signal: AbortSignal.timeout(1200) });
    cachedStatus = res.ok ? 'up' : 'down';
    lastCheckTime = Date.now();
    return cachedStatus;
  } catch (err) {
    logger.warn('[CDN HEALTH] Cloudinary probe failed:', err);
    cachedStatus = 'down';
    lastCheckTime = Date.now();
    return 'down';
  }
};
