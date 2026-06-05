import redisClient from './redis';
import crypto from 'crypto';
import logger from '../config/logger';

const BLACKLIST_PREFIX = 'jwt_blacklist:';

/**
 * Creates a sha256 hash of the token signature to use as the Redis key.
 * This ensures we don't store the full token in Redis.
 */
const hashSignature = (token: string): string | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const signature = parts[2];
  return crypto.createHash('sha256').update(signature).digest('hex');
};

/**
 * Adds an access token to the Redis blacklist until it expires.
 * @param token The full JWT access token
 * @param expiresInSeconds The number of seconds until the token naturally expires
 */
export const blacklistToken = async (
  token: string,
  expiresInSeconds: number = 900,
): Promise<void> => {
  if (!token) return;
  const hash = hashSignature(token);
  if (!hash) return;

  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.set(`${BLACKLIST_PREFIX}${hash}`, 'revoked', {
        EX: Math.max(1, expiresInSeconds),
      } as any);
      logger.debug(`[AUTH] Access token blacklisted in Redis (hash: ${hash.substring(0, 8)}...)`);
    }
  } catch (err) {
    logger.error('Failed to blacklist JWT in Redis:', err);
  }
};

/**
 * Checks if an access token is in the Redis blacklist.
 * @param token The full JWT access token
 * @returns boolean True if blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  if (!token) return false;
  const hash = hashSignature(token);
  if (!hash) return true; // Treat structurally invalid tokens as blacklisted

  try {
    if (redisClient && redisClient.isReady) {
      const exists = await redisClient.exists(`${BLACKLIST_PREFIX}${hash}`);
      return exists === 1;
    }
    return false;
  } catch (err) {
    // Fail open or fail closed? If Redis is down, fail open to prevent total outage.
    logger.error('Failed to check JWT blacklist in Redis:', err);
    return false;
  }
};
