import logger from '../config/logger';

export type CdnHealth = 'up' | 'down' | 'not_configured';

let cachedStatus: CdnHealth | null = null;
let lastCheckTime = 0;
let lastLoggedStatus: CdnHealth | null = null;

const SUCCESS_CACHE_TTL_MS = Number(process.env.CDN_HEALTH_CACHE_TTL_MS || 300000);
const FAIL_CACHE_TTL_MS = Number(process.env.CDN_FAIL_CACHE_TTL_MS || 60000);

/** Cloudinary-hosted demo asset — exists on every account without upload. */
const buildProbeUrl = (cloudName: string) =>
  `https://res.cloudinary.com/${cloudName}/image/upload/w_1,h_1,c_limit,f_auto,q_auto/demo`;

const isReachableStatus = (status: number) =>
  status >= 200 && status < 500;

/**
 * Probes Cloudinary delivery (not upload API). Used by cron and optional full health checks.
 * Failures are cached briefly; success is cached longer to avoid probe storms.
 */
export const checkCloudinaryCdn = async (options?: { force?: boolean }): Promise<CdnHealth> => {
  if (process.env.CDN_PROBE_DISABLED === 'true') {
    return 'not_configured';
  }

  const now = Date.now();
  const ttl =
    cachedStatus === 'down' ? FAIL_CACHE_TTL_MS : SUCCESS_CACHE_TTL_MS;
  if (!options?.force && cachedStatus && now - lastCheckTime < ttl) {
    return cachedStatus;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    setCached('not_configured', now);
    return 'not_configured';
  }

  const probeUrl = buildProbeUrl(cloudName);

  try {
    const res = await fetch(probeUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(Number(process.env.CDN_PROBE_TIMEOUT_MS || 8000)),
    });

    const next: CdnHealth = isReachableStatus(res.status) ? 'up' : 'down';
    setCached(next, now);
    logOnStateChange(next);
    return next;
  } catch (err) {
    setCached('down', now);
    logOnStateChange('down', err);
    return 'down';
  }
};

function setCached(status: CdnHealth, at: number) {
  cachedStatus = status;
  lastCheckTime = at;
}

function logOnStateChange(status: CdnHealth, err?: unknown) {
  if (status === lastLoggedStatus) return;
  lastLoggedStatus = status;

  if (status === 'down') {
    logger.warn('[CDN HEALTH] Cloudinary delivery probe failed', {
      error: err instanceof Error ? err.message : err,
    });
  } else if (status === 'up') {
    logger.info('[CDN HEALTH] Cloudinary delivery probe recovered');
  }
}

/** Cached CDN status without network I/O — safe for orchestrator probes. */
export function getCachedCdnHealth(): CdnHealth {
  if (process.env.CDN_PROBE_DISABLED === 'true') return 'not_configured';
  return cachedStatus ?? 'not_configured';
}
