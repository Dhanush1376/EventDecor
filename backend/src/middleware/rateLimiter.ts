import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options, ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../utils/redis';
import logger from '../config/logger';

// Standard rate limit bypass for local development or health checks
export const skipRateLimit = (req: Request) => {
  if (process.env.TEST_RATE_LIMIT === 'true') return false;

  if (process.env.NODE_ENV === 'development') {
    const ip = req.ip || req.socket.remoteAddress || '';
    if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost') {
      return true;
    }
  }

  const path = (req.originalUrl || req.url || '').split('?')[0];
  return (
    path === '/api/health' ||
    path === '/api/v1/health' ||
    path === '/api/readiness' ||
    path === '/api/v1/readiness' ||
    path === '/api/version' ||
    path === '/api/v1/version' ||
    path === '/favicon.ico' ||
    path === '/'
  );
};

// Custom key generator for account-based throttling
export const accountKeyGenerator = (req: Request, _res: Response): string => {
  const user = (req as Request & { user?: { id?: string } }).user;
  if (user?.id) {
    return `user_${user.id}`;
  }

  const ip = req.ip || req.socket.remoteAddress;
  if (!ip) {
    return 'unknown_ip';
  }

  return ipKeyGenerator(ip);
};

// Factory for creating a rate limiter with standard security defaults and abuse logging
export const createRateLimiter = (
  name: string,
  options: Partial<Options>,
  forceMemory: boolean = false,
) => {
  const customHandler = (req: Request, res: Response, next: NextFunction, optionsRef: any) => {
    // Log abuse detection to Winston
    logger.warn(`[ABUSE_DETECTED] Rate limit exceeded for limiter: ${name}`, {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      limit: optionsRef.limit || optionsRef.max,
    });

    // Set Retry-After header (RFC 6585) — tells clients when they can retry
    const windowSeconds = Math.ceil((optionsRef.windowMs || 900000) / 1000);
    res.setHeader('Retry-After', String(windowSeconds));

    res.status(optionsRef.statusCode || 429).json({
      success: false,
      message: optionsRef.message || 'Too many requests, please try again later.',
    });
  };

  const limiterOptions = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: customHandler,
    skip: skipRateLimit,
    ...options,
  } as Options;

  if (process.env.TEST_RATE_LIMIT === 'true') {
    limiterOptions.limit = 3;
  }

  const memoryLimiter = rateLimit(limiterOptions);
  let redisLimiter: any = null;
  let redisDownLogged = false;

  return (req: Request, res: Response, next: NextFunction) => {
    if (forceMemory) {
      return memoryLimiter(req, res, next);
    }

    // Use redis if available
    if (redisClient && redisClient.isReady) {
      if (redisDownLogged) {
        logger.info(
          `[REDIS RECOVERY] Redis reconnected, rate limiter '${name}' restored to Redis backend.`,
        );
        redisDownLogged = false;
      }

      if (!redisLimiter) {
        redisLimiter = rateLimit({
          ...limiterOptions,
          store: new RedisStore({
            // @ts-expect-error - Known issue with rate-limit-redis types and ioredis types
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
          }),
        });
      }
      return redisLimiter(req, res, next);
    }

    if (process.env.NODE_ENV === 'production') {
      if (process.env.REQUIRE_REDIS === 'true') {
        if (!redisDownLogged) {
          logger.warn(
            `[REDIS DOWN] Redis is required (REQUIRE_REDIS=true) but disconnected. Falling back to memory rate limiting for limiter '${name}' to preserve uptime. This may cause isolated per-process limits.`,
          );
          redisDownLogged = true;
        }
      } else {
        if (!redisDownLogged) {
          logger.warn(
            `[REDIS DOWN] Rate limiter '${name}' falling back to memory. This may cause isolated per-process rate limits.`,
          );
          redisDownLogged = true;
        }
      }
    }

    // Fallback to memory limiter (useful for tests or non-production environments)
    return memoryLimiter(req, res, next);
  };
};

// ==========================================
// Specific Limiters
// ==========================================

// Global limiter: 500 requests per 15 minutes per IP
export const globalLimiter = createRateLimiter('globalLimiter', {
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// API Flooding limiter: 50 requests per 10 seconds per IP
export const apiFloodingLimiter = createRateLimiter('apiFloodingLimiter', {
  windowMs: 10 * 1000,
  limit: 50,
  message: 'API flooding detected. Please slow down your requests.',
});

// Auth limiter: 10 requests per 15 minutes per IP (protects login/register/admin-login)
export const authLimiter = createRateLimiter('authLimiter', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
});

// OTP Send limiter: 5 requests per 15 minutes per IP/User
export const otpSendLimiter = createRateLimiter('otpSendLimiter', {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Too many OTP requests. Please try again after 15 minutes.',
  keyGenerator: accountKeyGenerator, // Limits by account if logged in, otherwise IP
});

// OTP Verify limiter: 10 requests per 15 minutes per IP
export const otpVerifyLimiter = createRateLimiter('otpVerifyLimiter', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many OTP verification attempts. Please try again after 15 minutes.',
});

// Contact/Inquiry limiter: 5 requests per 1 hour per IP
export const contactLimiter = createRateLimiter('contactLimiter', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'You have submitted too many contact requests. Please try again in an hour.',
});

// Search limiter: 50 requests per 10 minutes per IP
export const searchLimiter = createRateLimiter('searchLimiter', {
  windowMs: 10 * 60 * 1000,
  limit: 50,
  message: 'Too many search requests. Please try again after 10 minutes.',
});

// Recommendation/Tracking limiter: 100 requests per 10 minutes per IP/User
export const recommendationLimiter = createRateLimiter('recommendationLimiter', {
  windowMs: 10 * 60 * 1000,
  limit: 100,
  message: 'Too many recommendation or tracking requests. Please try again after 10 minutes.',
  keyGenerator: accountKeyGenerator,
});

// Upload limiter: 20 requests per 15 minutes per IP/User (protects Cloudinary/Network bandwidth)
export const uploadLimiter = createRateLimiter('uploadLimiter', {
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many file uploads. Please try again after 15 minutes.',
  keyGenerator: accountKeyGenerator,
});

// Signed URL limiter: 50 requests per 15 minutes per IP/User (for direct browser uploads)
export const signedUrlLimiter = createRateLimiter('signedUrlLimiter', {
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: 'Too many upload requests. Please try again after 15 minutes.',
  keyGenerator: accountKeyGenerator,
});

// Custom Order Submission Limiter: 5 requests per hour per IP/User
export const customOrderSubmissionLimiter = createRateLimiter('customOrderSubmissionLimiter', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'You have submitted too many custom order requests. Please try again in an hour.',
  keyGenerator: accountKeyGenerator,
});

// Chat Message Limiter: 20 messages per 5 minutes per IP/User
export const chatMessageLimiter = createRateLimiter('chatMessageLimiter', {
  windowMs: 5 * 60 * 1000,
  limit: 20,
  message: 'You are sending messages too quickly. Please slow down and try again in a few minutes.',
  keyGenerator: accountKeyGenerator,
});

// Visual Search Limiter: 10 image analyses per 5 minutes per IP (AI API calls are expensive)
export const visualSearchLimiter = createRateLimiter('visualSearchLimiter', {
  windowMs: 5 * 60 * 1000,
  limit: 10,
  message: 'Too many visual search requests. Please try again after 5 minutes.',
});
