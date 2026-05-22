import logger from '../config/logger';

export type CdnHealth = 'up' | 'down' | 'not_configured';

/**
 * HEAD request to Cloudinary CDN — used in /api/health and weekly cron.
 */
export const checkCloudinaryCdn = async (): Promise<CdnHealth> => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return 'not_configured';

  const probeUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_10,q_auto/sample.jpg`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(probeUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok ? 'up' : 'down';
  } catch (err) {
    logger.warn('[CDN HEALTH] Cloudinary probe failed:', err);
    return 'down';
  }
};
