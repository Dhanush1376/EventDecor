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
    if (body) {
      try {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        const isCartRoute = req.originalUrl.includes('/api/v1/users/cart');

        const suspiciousPatterns = [
          /mongodb(\+srv)?:\/\//i, // MongoDB URI
          /rzp_live_[a-zA-Z0-9]+/i, // Razorpay Live Key
          /sk_live_[a-zA-Z0-9]+/i, // Stripe Live Key
          /eyJhbGci[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, // Strict JWT matching '{"alg":'
        ];

        const isJwtAllowedRoute =
          req.originalUrl.includes('/api/auth') ||
          req.originalUrl.includes('/api/v1/auth') ||
          req.originalUrl.includes('/api/v1/orders') ||
          req.originalUrl.includes('/api/v1/event-bookings') ||
          req.originalUrl.includes('/api/v1/products') ||
          req.originalUrl.includes('/api/v1/warehouse') ||
          req.originalUrl.includes('/api/v1/shipping');

        for (const pattern of suspiciousPatterns) {
          if (isJwtAllowedRoute && pattern.source.includes('eyJ')) {
            continue;
          }

          if (pattern.test(bodyStr)) {
            logger.error(
              `[SECURITY AUDIT] 🚨 POTENTIAL SECRET LEAK PREVENTED on ${req.method} ${req.originalUrl}`,
            );

            if (isCartRoute) {
              logger.info('[CART_RESPONSE_TRACE][SECURITY_INTERCEPT]', {
                requestId: res.locals.forensicRequestId || 'unknown',
                matchedRule: pattern.source,
                actionTaken: 'REDACTED_RESPONSE_500',
                originalStatusCode: res.statusCode,
                finalStatusCode: 500,
                route: req.originalUrl,
                method: req.method,
              });
            }

            res.status(500);
            return originalJson.call(this, {
              success: false,
              errorCode: 'RESPONSE_SECURITY_BLOCKED',
              message: 'Internal server error (Response redacted by security interceptor)',
            });
          }
        }
      } catch {
        // Ignore JSON stringify errors
      }
    }

    if (req.originalUrl.includes('/api/v1/users/cart')) {
      logger.info('[CART_RESPONSE_TRACE][FINAL_BODY]', {
        requestId: res.locals.forensicRequestId || 'unknown',
        purchaseItemCount: body?.data?.purchaseCart?.items?.length ?? 0,
        rentalItemCount: body?.data?.rentalCart?.items?.length ?? 0,
        topLevelKeys: Object.keys(body || {}),
        dataKeys: body?.data ? Object.keys(body.data) : [],
        route: req.originalUrl,
        method: req.method,
      });
    }

    return originalJson.call(this, body);
  };

  next();
};
