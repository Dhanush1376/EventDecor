import redisClient from './redis';
import logger from '../../config/logger';

const TTL_SECONDS = 30;
const keyFor = (challengeId: string) => `otp:verified:${challengeId}`;

/**
 * Redis-backed idempotency for concurrent OTP verify requests (multi-instance safe).
 */
export const getCachedOtpSession = async <T>(
  challengeId: string,
  _otp?: string,
): Promise<T | null> => {
  if (!redisClient?.isReady) return null;
  try {
    const raw = await redisClient.get(keyFor(challengeId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('[OTP CACHE] Read failed:', err);
    return null;
  }
};

export const cacheOtpSession = async (
  challengeId: string,
  _otp: string,
  session: unknown,
): Promise<void> => {
  if (!redisClient?.isReady) return;
  try {
    await redisClient.set(keyFor(challengeId), JSON.stringify(session), { EX: TTL_SECONDS });
  } catch (err) {
    logger.warn('[OTP CACHE] Write failed:', err);
  }
};
