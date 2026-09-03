import redisClient from '../cache/redis';
import logger from '../../config/logger';

const WINDOW_SECONDS = 600;
const MAX_SEND_PER_IP = 5;
const MAX_VERIFY_FAIL_PER_IP = 5;

const sendKey = (ip: string) => `otp:send:${ip}`;
const verifyFailKey = (ip: string) => `otp:verify_fail:${ip}`;
const phoneSendKey = (phone: string) => `otp:send:phone:${phone}`;
const identifierSendKey = (identifier: string) => `otp:send:identifier:${identifier}`;
const dailyLimitKey = (identifier: string) => `otp:daily:${identifier}`;

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

export const checkPhoneOtpSendAllowed = async (phone: string): Promise<boolean> => {
  if (!redisClient || !redisClient.isReady) return true;
  try {
    const count = await redisClient.incr(phoneSendKey(phone));
    if (count === 1) {
      await redisClient.expire(phoneSendKey(phone), 900); // 15 mins
    }

    const dailyCount = await redisClient.incr(dailyLimitKey(phone));
    if (dailyCount === 1) {
      await redisClient.expire(dailyLimitKey(phone), 86400); // 24 hours
    }

    return count <= 3 && dailyCount <= 10;
  } catch (err) {
    logger.warn('[OTP RATE] Phone send check failed:', err);
    return true;
  }
};

export const checkIdentifierOtpSendAllowed = async (identifier: string): Promise<boolean> => {
  if (!redisClient || !redisClient.isReady) return true;
  try {
    const count = await redisClient.incr(identifierSendKey(identifier));
    if (count === 1) {
      await redisClient.expire(identifierSendKey(identifier), 3600); // 1 hour
    }

    const dailyCount = await redisClient.incr(dailyLimitKey(identifier));
    if (dailyCount === 1) {
      await redisClient.expire(dailyLimitKey(identifier), 86400); // 24 hours
    }

    return count <= 5 && dailyCount <= 10;
  } catch (err) {
    logger.warn('[OTP RATE] Identifier send check failed:', err);
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
