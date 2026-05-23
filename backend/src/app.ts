import express, { Application, Request, Response } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { handleRazorpayWebhook } from './controllers/orderController';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient, { pingRedis } from './utils/redis';
import errorMiddleware from './middleware/errorMiddleware';
import { registerApiRoutes } from './routes/registerApiRoutes';
import { checkCloudinaryCdn, getCachedCdnHealth } from './utils/cdnHealth';
import logger from './config/logger';
import { getSocketAdapterMode } from './config/socketState';
import { generateSitemap } from './utils/sitemapGenerator';
import * as Sentry from "@sentry/node";
import { requestTrackerMiddleware } from './middleware/requestTracker';
import { requestLogger } from './middleware/requestLogger';
import { issueCsrfToken, validateCsrf } from './middleware/csrfMiddleware';
import { enforceHttps } from './middleware/enforceHttps';

// Use require for the inner xss-clean function
const { clean: xssClean } = require('xss-clean/lib/xss');

const app: Application = express();

// Disable x-powered-by to prevent tech stack signature disclosure
app.disable('x-powered-by');

// Trust proxy hops — must match your deployment (see docs/DEPLOYMENT.md).
// Render / Vercel: 1. Cloudflare → Render: 2. Override with TRUST_PROXY_HOPS.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  logger.error('[STARTUP] TRUST_PROXY_HOPS must be an integer between 0 and 5');
  process.exit(1);
}
app.set('trust proxy', trustProxyHops);
logger.info(`[STARTUP] Express trust proxy hops: ${trustProxyHops}`);

// Production: redirect when TLS is not terminated (bare Docker / misconfigured proxy)
app.use(enforceHttps);
if (process.env.NODE_ENV !== 'production') {
  logger.info(
    `[STARTUP] TRUST_PROXY_HOPS=${trustProxyHops} — must match proxy chain (Render=1, Cloudflare+Render=2). See docs/DEPLOYMENT.md`
  );
}

// Boot Request Tracker AsyncLocalStorage context as early as possible
app.use(requestTrackerMiddleware);


// 0. Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

// 1. Security Middlewares
// Generate a nonce for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", (req, res) => `'nonce-${(res as any).locals.nonce}'`, "https://checkout.razorpay.com", "https://*.razorpay.com", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lux.razorpay.com", ...(process.env.SENTRY_DSN ? ["https://*.sentry.io"] : [])],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      manifestSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Razorpay checkout iframe + Cloudinary assets break under require-corp
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// Permissions-Policy: restrict sensitive browser APIs
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), interest-cohort=()');
  next();
});

// 2. CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://siriartsandcrafts.com",
  "https://www.siriartsandcrafts.com",
  "https://siriarts-n-crafts.vercel.app",
  "https://siri-artsandcrafts.vercel.app",
  "https://siri-arts-n-crafts.onrender.com",
  // Merge production origins from FRONTEND_URLS env var
  ...(process.env.FRONTEND_URLS || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean)
    .map(u => u.startsWith('http') ? u : `https://${u}`)
    .filter(u => !['http://localhost:3000', 'http://localhost:5173'].includes(u)),
];

export const isOriginAllowed = (origin: string): boolean => {
  // Allow all origins in development (for mobile LAN testing)
  if (process.env.NODE_ENV === 'development') return true;
  
  // Allow any vercel domain containing 'siri' and 'arts' to cover all potential aliases
  const vercelPreviewRegex = /^https:\/\/.*siri.*arts.*\.vercel\.app$/i;
  return allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin);
};

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  // Payment provider webhooks have no browser Origin header
  if (req.path === '/api/orders/webhook') {
    return next();
  }

  const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!mutatingMethod || process.env.NODE_ENV === 'development') {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Request origin is not allowed by server policy.',
  });
});


// ─── Razorpay Webhook (MUST be registered BEFORE body parsing middleware) ───
// Razorpay HMAC signature verification requires the raw, unparsed request body.
// Parsing with express.json() + XSS sanitization corrupts the payload and breaks signature checks.
app.post(
  '/api/orders/webhook',
  (req: Request, res: Response, next) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json',
      });
    }
    next();
  },
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response, next) => {
    const raw = req.body as Buffer;
    if (!raw?.length) {
      return res.status(400).json({ success: false, message: 'Webhook body is empty' });
    }
    (req as any).rawBody = raw;
    try {
      req.body = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, message: 'Webhook body is not valid JSON' });
    }
    next();
  },
  handleRazorpayWebhook
);

// 3. Request Parsing (MUST be before sanitization)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CSRF double-submit cookie (required for cookie-credentialed mutating requests)
app.get('/api/csrf-token', issueCsrfToken);
app.get('/api/v1/csrf-token', issueCsrfToken); // Fallback for frontend base URLs pointing to /api/v1
app.use('/api', validateCsrf);

// Enable production-safe structured request logging and execution telemetry
app.use(requestLogger);

// 4. Sanitization & Performance
app.use(compression());
// Express 5 makes req.query a getter, so we cannot reassign it directly.
// We apply sanitization in-place or handle it without reassignment.
app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body);
    req.body = xssClean(req.body);
  }
  if (req.query) {
    mongoSanitize.sanitize(req.query);
    const cleaned = xssClean(req.query);
    for (const key in req.query) {
      delete req.query[key];
    }
    for (const key in cleaned) {
      req.query[key] = cleaned[key];
    }
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params);
    const cleaned = xssClean(req.params);
    for (const key in req.params) {
      delete req.params[key];
    }
    for (const key in cleaned) {
      req.params[key] = cleaned[key];
    }
  }
  next();
});

// Welcome / health-check redirect at root level
app.get('/', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    message: 'Welcome to Siri Arts & Crafts API Gateway. Systems are fully functional.',
    timestamp: new Date().toISOString(),
    documentation: 'https://github.com/Dhanush1376/EventDecor',
  });
});

// Ignore favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Dynamic sitemap.xml endpoint for SEO bots
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const xml = await generateSitemap();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
  } catch (err: any) {
    logger.error(`[APP SITEMAP ROUTE ERROR] ${err.message}`);
    res.status(500).type('text/plain').send('Error serving dynamic sitemap');
  }
});

// Rate Limiting
const rateLimitConfig = (options: any) => {
  const memoryLimiter = rateLimit(options);
  let redisLimiter: any = null;

  return (req: Request, res: Response, next: any) => {
    if (redisClient && redisClient.isReady) {
      if (!redisLimiter) {
        redisLimiter = rateLimit({
          ...options,
          store: new RedisStore({
            // @ts-ignore
            sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
          }),
        });
      }
      return redisLimiter(req, res, next);
    }
    return memoryLimiter(req, res, next);
  };
};

const skipRateLimit = (req: Request) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  return (
    path === '/api/health' ||
    path === '/api/readiness' ||
    path === '/api/version' ||
    path === '/favicon.ico' ||
    path === '/'
  );
};

const globalLimiter = rateLimitConfig({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
});

const authLimiter = rateLimitConfig({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for auth routes (login/register/otp)
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpSendLimiter = rateLimitConfig({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 OTP requests per 10 minutes
  message: { message: 'Too many OTP requests from this IP. Please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimitConfig({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { message: 'Too many OTP verification attempts from this IP. Please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const testRateLimitEnabled = process.env.TEST_RATE_LIMIT === 'true';

if (process.env.NODE_ENV === 'production' || testRateLimitEnabled) {
  if (testRateLimitEnabled) {
    const testLimiter = rateLimitConfig({
      windowMs: 60 * 1000,
      max: 3,
      message: 'Too many requests (TEST_RATE_LIMIT)',
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/', testLimiter);
    app.use('/api/v1/', testLimiter);
  } else {
    app.use('/api/', globalLimiter);
    app.use('/api/auth/send-otp', otpSendLimiter);
    app.use('/api/v1/auth/send-otp', otpSendLimiter);
    app.use('/api/auth/verify-otp', otpVerifyLimiter);
    app.use('/api/v1/auth/verify-otp', otpVerifyLimiter);
    app.use('/api/auth', authLimiter);
    app.use('/api/v1/auth', authLimiter);
  }
} else {
  const devLimiter = rateLimitConfig({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', devLimiter);
}


// 5. Caching & Performance telemetry already loaded above


// 6. Health Check — lite by default (no CDN probe); ?full=1 runs delivery probe for dashboards
app.get('/api/health', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'UP' : 'DOWN';
  const redisStatus = await pingRedis();
  const fullProbe = req.query.full === '1' || req.query.full === 'true';
  const cdnStatus = fullProbe ? await checkCloudinaryCdn() : getCachedCdnHealth();
  const requireRedis = process.env.REQUIRE_REDIS === 'true';
  const redisRequiredDown =
    requireRedis && (redisStatus === 'down' || redisStatus === 'not_configured');

  const dbHealthFail = dbState !== 1 || redisRequiredDown;

  const healthData = {
    success: !dbHealthFail,
    status: dbHealthFail ? 'critical' : 'healthy',
    message: 'Siri Arts API Status',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      state: dbState,
    },
    redis: {
      status: redisStatus,
      required: requireRedis,
    },
    cdn: {
      provider: 'cloudinary',
      status: cdnStatus,
      advisory: true,
      probed: fullProbe,
    },
    system: {
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usage: `${Math.round((1 - os.freemem() / os.totalmem()) * 100)}%`,
      },
      cpuLoad: os.loadavg(),
    },
    realtime: {
      adapter: getSocketAdapterMode(),
      degraded:
        process.env.NODE_ENV === 'production' && getSocketAdapterMode() === 'memory',
    },
  };

  if (dbHealthFail) {
    logger.error('[HEALTH] Critical dependency down', healthData);
    return res.status(503).json(healthData);
  }

  return res.status(200).json(healthData);
});

// Readiness Probe (returns 503 until DB is connected — use for orchestrators)
app.get('/api/readiness', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ ready, timestamp: new Date().toISOString() });
});

// Version endpoint — minimal public payload (no environment disclosure)
app.get('/api/version', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ version: process.env.npm_package_version || '1.0.0' });
});

// 7. API Routes — /api/v1 is the stable contract; /api is a legacy alias (see docs/API_VERSIONING.md)
registerApiRoutes(app, '/api/v1', 'v1');
registerApiRoutes(app, '/api', 'legacy');

// 8. Sentry Error Handler (must be before any other error middleware)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// 9. Global Error Handler
app.use(errorMiddleware);

export default app;
