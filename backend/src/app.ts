import express, { Application, Request, Response } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import { corsMiddleware, corsHandler } from './middleware/corsMiddleware';
import { securityHeadersMiddleware } from './middleware/helmetMiddleware';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
const xss = require('xss-clean');

import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import redisClient, { pingRedis } from './utils/redis';
import { globalLimiter, apiFloodingLimiter } from './middleware/rateLimiter';
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
import { isOriginAllowed, ALLOWED_VERCEL_PREVIEWS } from './config/corsConfig';
import { dbReadinessGuard } from './middleware/dbReadinessGuard';
import { requireAuth, requireAdmin } from './middleware/authMiddleware';
import { getMetricsReport, metricsTrackerMiddleware } from './utils/metricsTracker';
import { getIO } from './socket';
import { enforceHttps } from './middleware/enforceHttps';
import { queryGuard } from './middleware/queryGuard';
import { secretLeakInterceptor } from './config/secretAudit';
import { noCacheMiddleware } from './middleware/noCacheMiddleware';
import { requestTimeout } from './middleware/queryTimeout';
import { pingDb, getDbMetrics } from './config/db';
import { cacheHeadersMiddleware } from './middleware/cacheHeaders';


// Use require for the inner xss-clean function
const { clean: xssClean } = require('xss-clean/lib/xss');

const app: Application = express();

// Disable x-powered-by to prevent tech stack signature disclosure
app.disable('x-powered-by');

// Trust proxy hops — enforced to 1 for Render.
// If moving to Cloudflare + Render, this should be updated to 2.
app.set('trust proxy', 1);
logger.info(`[STARTUP] Express trust proxy hops: 1`);

// Production: redirect HTTP → HTTPS with host validation (prevents open-redirect via header injection)
app.use(enforceHttps);

// Boot Request Tracker AsyncLocalStorage context as early as possible
app.use(requestTrackerMiddleware);
app.use(metricsTrackerMiddleware);
app.use(cacheHeadersMiddleware);

// 0. Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

// 1. Security Middlewares
app.use(securityHeadersMiddleware);
app.use(secretLeakInterceptor);

// 2. CORS Configuration
app.options(/.*/, corsHandler); // Pre-flight global handler
app.use(corsMiddleware);


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
  (req: Request, res: Response, next: express.NextFunction) => {
    try {
      const controller = require('./features/orders/orderController');
      controller.handleRazorpayWebhook(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// 3. Request Parsing (MUST be before sanitization)
// Pre-validate body size before parsing to prevent CPU exhaustion on XSS sanitization
app.use((req: Request, res: Response, next) => {
  if (req.path.includes('/upload') || req.path.includes('/webhook')) {
    return next();
  }
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10240) { // 10kb limit for standard JSON payloads
    logger.warn(`[SECURITY] Blocked oversized payload (${contentLength} bytes) to ${req.path}`);
    return res.status(413).json({ success: false, message: 'Payload Too Large' });
  }
  next();
});

// 50kb is the max parsed size limit internally, but our 10kb guard catches oversized bodies first
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb', parameterLimit: 50 }));
app.use(cookieParser());

// CSRF double-submit cookie (required for cookie-credentialed mutating requests)
app.get('/api/csrf-token', issueCsrfToken);
app.get('/api/v1/csrf-token', issueCsrfToken); // Fallback for frontend base URLs pointing to /api/v1
app.use('/api', validateCsrf);
app.use(dbReadinessGuard);

// Enable production-safe structured request logging and execution telemetry
app.use(requestLogger);

// 4. Sanitization & Performance
app.use(compression());
app.use(queryGuard); // Guard against complex NoSQL injection vectors (depth, raw $ operators in query)
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
app.get('/', noCacheMiddleware, (req: Request, res: Response) => {
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

// Apply per-request timeout guard (30s default — excludes webhooks/uploads automatically)
app.use(requestTimeout(15000));

// Apply global rate limiting and API flooding protection
app.use('/api/', apiFloodingLimiter);
app.use('/api/', globalLimiter);


// 5. Caching & Performance telemetry already loaded above


// 6. Health Check — lite by default (no CDN probe); ?full=1 runs delivery probe for dashboards
app.get('/api/health', noCacheMiddleware, async (req: Request, res: Response) => {

  const dbState = mongoose.connection.readyState;
  let dbStatus = dbState === 1 ? 'UP' : 'DOWN';
  const redisStatus = await pingRedis();
  const fullProbe = req.query.full === '1' || req.query.full === 'true';
  const cdnStatus = fullProbe ? await checkCloudinaryCdn() : getCachedCdnHealth();
  const requireRedis = process.env.REQUIRE_REDIS === 'true';
  
  if (fullProbe && dbState === 1) {
    const isPingOk = await pingDb();
    if (!isPingOk) {
      dbStatus = 'DEGRADED';
    }
  }

  const redisRequiredDown =
    requireRedis && (redisStatus === 'down' || redisStatus === 'not_configured');

  const dbHealthFail = dbState !== 1 || dbStatus === 'DEGRADED' || redisRequiredDown;

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

// Readiness Probe (Tracks HTTP readiness, not DB readiness to prevent Render crash loops)
app.get('/api/readiness', noCacheMiddleware, (req: Request, res: Response) => {
  // Return 200 immediately if HTTP server is reachable.
  // DB degradation should be handled via circuit breakers and bufferCommands: false, NOT pod restarts.
  res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
});

// Version endpoint — minimal public payload (no environment disclosure)
app.get('/api/version', noCacheMiddleware, (req: Request, res: Response) => {
  res.json({ version: process.env.npm_package_version || '1.0.0' });
});

// Telemetry & Metrics endpoint - protected, admin-only
app.get('/api/metrics', requireAuth, requireAdmin, noCacheMiddleware, async (req: Request, res: Response) => {

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'UP' : 'DOWN';
  const dbMetrics = getDbMetrics();
  
  let activeSockets = 0;
  try {
    const io = getIO();
    if (io) {
      activeSockets = io.engine.clientsCount;
    }
  } catch {
    // Socket.io not yet initialized
  }

  const pingRedis = require('./utils/redis').pingRedis;
  const redisStatus = await pingRedis();

  const report = getMetricsReport();

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      state: dbState,
      metrics: dbMetrics,
    },
    redis: {
      status: redisStatus,
    },
    realtime: {
      activeConnections: activeSockets,
      adapter: getSocketAdapterMode(),
    },
    system: {
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usage: `${Math.round((1 - os.freemem() / os.totalmem()) * 100)}%`,
        processUsage: process.memoryUsage(),
      },
      cpuLoad: os.loadavg(),
    },
    telemetry: report,
  });
});

// Enforce raw upload size limit before multer buffers to prevent RAM exhaustion
app.use('/api/v1/upload', (req: Request, res: Response, next: express.NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 51 * 1024 * 1024) { // 51MB
    return res.status(413).json({ success: false, message: 'Request payload too large' });
  }
  next();
});

// 7. API Routes
// Deprecation rewrite for legacy /api consumers
app.use('/api', (req: Request, res: Response, next: express.NextFunction) => {
  if (req.path.startsWith('/v1/')) {
    return next();
  }
  res.setHeader('Deprecation', 'true');
  res.setHeader('Link', '</api/v1>; rel="successor-version"');
  logger.warn(`[DEPRECATION] Legacy API accessed: ${req.originalUrl} by ${req.ip}`);
  req.url = `/v1${req.url === '/' ? '' : req.url}`;
  next();
});

registerApiRoutes(app, '/api/v1', 'v1');

// 8. Sentry Error Handler (must be before any other error middleware)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// 9. Global Error Handler
app.use(errorMiddleware);

export default app;
