import helmet from 'helmet';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise-grade HTTP Security Headers Middleware
 * - Generates cryptographically secure nonces for inline scripts
 * - Enforces rigorous Content Security Policy (CSP)
 * - Configures strict HSTS (Production only)
 * - Restricts browser capabilities via Permissions-Policy
 */

// 1. Nonce Generation Middleware
const generateNonce = (req: Request, res: Response, next: NextFunction) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

// 2. Helmet Configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      fontSrc: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'none'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Razorpay checkout iframe + Cloudinary assets break under require-corp
  crossOriginEmbedderPolicy: false,
  // Isolate browsing context to prevent cross-origin window references
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  hsts:
    process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false, // Disable HSTS in dev to prevent localhost HTTPS redirects
  // Prevent browser DNS prefetching that could leak visited domains
  dnsPrefetchControl: { allow: false },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  xFrameOptions: { action: 'sameorigin' }, // Redundant with frameAncestors but good fallback for older browsers
});

// 3. Custom Security Headers
const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent access to potentially sensitive APIs
  // Using modern directives. Allow payment only from Razorpay if necessary, otherwise self.
  const policy =
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), usb=(), payment=(self "https://checkout.razorpay.com")';
  res.setHeader('Permissions-Policy', policy);

  // Explicitly set these to satisfy security scanners (Helmet might omit in newer versions)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');

  next();
};

// Export the complete middleware chain
export const securityHeadersMiddleware = [generateNonce, helmetConfig, customSecurityHeaders];
