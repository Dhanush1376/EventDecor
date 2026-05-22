/**
 * Lightweight feature flags from environment (no external service).
 * Example: FEATURE_2FA=true, FEATURE_FLAGS=betaCheckout,newGallery
 */
const parseList = (raw?: string): Set<string> =>
  new Set(
    (raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

const flagSet = parseList(process.env.FEATURE_FLAGS);

export const isFeatureEnabled = (name: string): boolean => {
  if (flagSet.has(name)) return true;
  const envKey = `FEATURE_${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  return process.env[envKey] === 'true';
};

export const getFeatureFlags = (): Record<string, boolean> => ({
  twoFactorAuth: isFeatureEnabled('2FA') || isFeatureEnabled('twoFactorAuth'),
  apiV1: isFeatureEnabled('apiV1') || true,
});
