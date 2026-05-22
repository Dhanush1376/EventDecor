import redisClient from './redis';
import logger from '../config/logger';

const WINDOW_SECONDS = 600;
const MAX_SEND_PER_IP = 5;
const MAX_VERIFY_FAIL_PER_IP = 5;

const sendKey = (ip: string) => `otp:send:${ip}`;
const verifyFailKey = (ip: string) => `otp:verify_fail:${ip}`;

/**
 * Redis-backed OTP send rate limit (falls back to allowing when Redis is down).
 */
export const checkOtpSendAllowed = async (ip: string): Promise<boolean> => {
  if (!redisClient || !redisClient.isReady) return true;
  try {
    const count = await redisClient.incr(sendKey(ip));
    if (count === 1) {
      await redisClient.expire(sendKey(ip), WINDOW_SECONDS);
    }
    return count <= MAX_SEND_PER_IP;
  } catch (err) {
    logger.warn('[OTP RATE] Send check failed, allowing request:', err);
    return true;
  }
};

export const recordOtpVerifyFailure = async (ip: string): Promise<number> => {
  if (!redisClient || !redisClient.isReady) return 0;
  try {
    const count = await redisClient.incr(verifyFailKey(ip));
    if (count === 1) {
      await redisClient.expire(verifyFailKey(ip), WINDOW_SECONDS);
    }
    return count;
  } catch (err) {
    logger.warn('[OTP RATE] Verify failure record failed:', err);
    return 0;
  }
};

export const isOtpVerifyBlocked = async (ip: string): Promise<boolean> => {
  if (!redisClient || !redisClient.isReady) return false;
  try {
    const count = await redisClient.get(verifyFailKey(ip));
    return Number(count || 0) >= MAX_VERIFY_FAIL_PER_IP;
  } catch {
    return false;
  }
};
