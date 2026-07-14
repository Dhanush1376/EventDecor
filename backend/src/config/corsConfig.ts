import { CorsOptions } from 'cors';
import logger from './logger';

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
    .map((u) => u.trim())
    .filter(Boolean);

  for (const origin of envOrigins) {
    try {
      // Use URL constructor to ensure it's a valid URI and to strip trailing slashes securely
      const url = new URL(origin.startsWith('http') ? origin : `https://${origin}`);
      origins.add(url.origin);
    } catch {
      logger.error(`[CORS CONFIG] Invalid origin in FRONTEND_URLS: ${origin}`);
    }
  }

  // Explicit hardcoded production domains as backup
  origins.add('https://siriartsandcrafts.com');
  origins.add('https://www.siriartsandcrafts.com');
  origins.add('https://api.siriartsandcrafts.com');

  return origins;
};

const allowedOrigins = getDynamicOrigins();

export const isOriginAllowed = (origin: string): boolean => {
  if (!origin || origin === 'null') return false;

  try {
    const parsedUrl = new URL(origin);
    const parsedOrigin = parsedUrl.origin;
    const _hostname = parsedUrl.hostname;

    // Allow all origins for mobile testing in development
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      return true;
    }

    if (allowedOrigins.has(parsedOrigin)) {
      return true;
    }

    return false;
  } catch {
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
      'x-csrf-token',
      'Cache-Control',
    ],
  };

  if (!origin) {
    // Allow requests with no origin (like same-origin browser requests via Vite proxy, curl, or Postman)
    return callback(null, { ...options, origin: true });
  }

  if (isOriginAllowed(origin)) {
    return callback(null, { ...options, origin: true });
  }

  logger.warn(`[CORS BLOCKED] Unauthorized origin attempt: ${origin}`);
  callback(new Error(`Not allowed by CORS: ${origin}`));
};
