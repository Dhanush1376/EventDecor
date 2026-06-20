import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { env } from './envSchema';

/**
 * 1. Startup: Audit all environment variables for known sandbox/test credentials in production.
 */
export const auditEnvOnStartup = () => {
  if (env.NODE_ENV !== 'production') return;

  const sandboxPrefixes = ['test_', 'sandbox_', 'sk_test_', 'rzp_test_'];

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      const lowerVal = value.toLowerCase();
      if (sandboxPrefixes.some((prefix) => lowerVal.startsWith(prefix))) {
        logger.warn(
          `[SECURITY AUDIT] Environment variable ${key} appears to contain a sandbox/test credential in production!`,
        );
      }
    }
  }

  // Secret rotation reminder
  if (env.SECRET_ROTATION_REMINDER) {
    const rotationDate = new Date(env.SECRET_ROTATION_REMINDER);
    if (!isNaN(rotationDate.getTime()) && new Date() > rotationDate) {
      logger.error(
        `[SECURITY AUDIT] 🚨 CRITICAL: Secret rotation date (${env.SECRET_ROTATION_REMINDER}) has passed! Rotate JWT_SECRET and FIELD_ENCRYPTION_KEY immediately.`,
      );
    }
  }
};

/**
 * 2. Runtime: Express response interceptor to detect leaked secrets.
 * Scans outgoing JSON responses for known secret patterns.
 */
export const secretLeakInterceptor = (req: Request, res: Response, next: NextFunction) => {
  if (env.NODE_ENV !== 'production') {
    return next();
  }

  const originalJson = res.json;

  res.json = function (body: any) {
    // Only scan if body is an object or string
    if (body) {
      try {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

        // Patterns to look for in response payload
        const suspiciousPatterns = [
          /mongodb(\+srv)?:\/\//i, // MongoDB URI
          /rzp_live_[a-zA-Z0-9]+/i, // Razorpay Live Key
          /sk_live_[a-zA-Z0-9]+/i, // Stripe Live Key
          /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, // JWT (could be normal if it's the auth endpoint, but we only flag if it's not auth route)
        ];

        // We allow JWTs on auth routes
        const isAuthRoute =
          req.originalUrl.includes('/api/auth') || req.originalUrl.includes('/api/v1/auth');

        for (const pattern of suspiciousPatterns) {
          // If it's a JWT pattern and we are on an auth route, skip
          if (isAuthRoute && pattern.source.includes('eyJ')) {
            continue;
          }

          if (pattern.test(bodyStr)) {
            logger.error(
              `[SECURITY AUDIT] 🚨 POTENTIAL SECRET LEAK PREVENTED on ${req.method} ${req.originalUrl}`,
            );

            // Redact the response to prevent leak
            return originalJson.call(this, {
              success: false,
              message: 'Internal server error (Response redacted by security interceptor)',
            });
          }
        }
      } catch {
        // Ignore JSON stringify errors
      }
    }

    return originalJson.call(this, body);
  };

  next();
};
