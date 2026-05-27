import { CorsOptions } from 'cors';
import logger from './logger';

export const ALLOWED_VERCEL_PREVIEWS = new Set([
  'https://siriarts-n-crafts.vercel.app',
  'https://siri-artsandcrafts.vercel.app',
  'https://siri-arts-n-crafts.vercel.app',
]);

const getDynamicOrigins = (): Set<string> => {
  const origins = new Set<string>();

  // Base dev origins
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:5173');
  }

  // Load from environment
  const envOrigins = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

  for (const origin of envOrigins) {
    try {
      // Use URL constructor to ensure it's a valid URI and to strip trailing slashes securely
      const url = new URL(origin.startsWith('http') ? origin : `https://${origin}`);
      origins.add(url.origin);
    } catch (err) {
      logger.error(`[CORS CONFIG] Invalid origin in FRONTEND_URLS: ${origin}`);
    }
  }

  // Explicit hardcoded production domains as backup
  origins.add('https://siriartsandcrafts.com');
  origins.add('https://www.siriartsandcrafts.com');

  return origins;
};

export const allowedOrigins = getDynamicOrigins();

export const isOriginAllowed = (origin: string): boolean => {
  if (!origin || origin === 'null') return false;

  try {
    const parsedUrl = new URL(origin);
    const parsedOrigin = parsedUrl.origin;
    const hostname = parsedUrl.hostname;

    // Allow strictly defined origins in development (for mobile LAN testing), but not in Jest tests
    if (process.env.NODE_ENV === 'development' && !process.env.JEST_WORKER_ID) {
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.')
      ) {
        return true;
      }
    }

    if (allowedOrigins.has(parsedOrigin)) {
      return true;
    }

    // Support wildcard Vercel previews securely without regex bypass
    if (
      ALLOWED_VERCEL_PREVIEWS.has(parsedOrigin) || 
      (parsedOrigin.endsWith('.vercel.app') && process.env.NODE_ENV !== 'production')
    ) {
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
};

/**
 * Enterprise-grade CORS options
 * - Enforces dynamic origin validation
 * - Caches preflight requests
 * - Prevents wildcard origin usage with credentials
 */
export const corsOptions = (req: any, callback: any) => {
  const origin = req.header('Origin');
  
  const options: CorsOptions = {
    credentials: true,
    optionsSuccessStatus: 200, // Legacy browsers choke on 204. Use 200 for preflight.
    maxAge: 86400, // Cache preflight response for 24 hours
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-csrf-token'
    ]
  };

  if (!origin) {
    const path = req.path || '';
    const webhookPaths = ['/api/orders/webhook', '/api/readiness', '/api/v1/csrf-token'];
    if (webhookPaths.some(p => path.startsWith(p))) {
      return callback(null, { ...options, origin: true });
    }
    return callback(new Error('Not allowed by CORS: No origin header — request blocked'));
  }

  if (isOriginAllowed(origin)) {
    return callback(null, { ...options, origin: true });
  }

  logger.warn(`[CORS BLOCKED] Unauthorized origin attempt: ${origin}`);
  callback(new Error(`Not allowed by CORS: ${origin}`));
};
