import express, { Application, Request, Response } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import { corsMiddleware, corsHandler } from './middleware/corsMiddleware';
import { securityHeadersMiddleware } from './middleware/helmetMiddleware';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { xssSanitize } from './utils/security/xssSanitizer';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import cookieParser from 'cookie-parser';
import { globalLimiter, apiFloodingLimiter } from './middleware/rateLimiter';
import errorMiddleware from './middleware/errorMiddleware';
import { registerApiRoutes } from './routes/registerApiRoutes';
import healthRoutes from './routes/system/healthRoutes';
import metricsRoutes from './routes/system/metricsRoutes';
import { HealthController } from './controllers/system/healthController';
import logger from './config/logger';
import { getSocketAdapterMode } from './config/socketState';
import { generateSitemap } from './utils/sitemapGenerator';
import { PrometheusService } from './services/PrometheusService';
import * as Sentry from '@sentry/node';
import { requestTrackerMiddleware } from './middleware/requestTracker';
import { requestLogger } from './middleware/requestLogger';
import { issueCsrfToken, validateCsrf } from './middleware/csrfMiddleware';
import { dbReadinessGuard } from './middleware/dbReadinessGuard';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware';
import { requireAuth, requireAdmin } from './middleware/authMiddleware';
import { getMetricsReport, metricsTrackerMiddleware } from './utils/metricsTracker';
import { getIO } from './socket';
import { enforceHttps } from './middleware/enforceHttps';
import { queryGuard } from './middleware/queryGuard';
import { secretLeakInterceptor } from './config/secretAudit';
import { noCacheMiddleware } from './middleware/noCacheMiddleware';
import { requestTimeout } from './middleware/queryTimeout';
import { getDbMetrics } from './config/db';
import { cacheHeadersMiddleware } from './middleware/cacheHeaders';

const app: Application = express();

// Disable x-powered-by to prevent tech stack signature disclosure
app.disable('x-powered-by');

// Trust proxy hops — enforced to 1 for Railway/Render.
// If moving to Cloudflare + Railway, this should be updated to 2.
const trustProxy = process.env.TRUST_PROXY_HOPS ? parseInt(process.env.TRUST_PROXY_HOPS, 10) : 1;
app.set('trust proxy', trustProxy);
logger.info(`[STARTUP] Express trust proxy hops: ${trustProxy}`);

// Initialize Prometheus Metrics
PrometheusService.initialize();

// Production: redirect HTTP → HTTPS with host validation (prevents open-redirect via header injection)
app.use(enforceHttps);

// Boot Request Tracker AsyncLocalStorage context as early as possible
app.use(requestTrackerMiddleware);
app.use(metricsTrackerMiddleware);
app.use(cacheHeadersMiddleware);

// Initialize Sentry Error Tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Performance traces are shipped off-box (counts as egress). 5% in production
    // is plenty for trend visibility; errors are still captured at 100%.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  });
}

// Security Middlewares
app.use(securityHeadersMiddleware);
app.use(secretLeakInterceptor);

// CORS Configuration
app.options(/.*/, corsHandler); // Pre-flight global handler
app.use(corsMiddleware);

// Razorpay Webhook (MUST be registered BEFORE body parsing middleware)
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
  express.raw({ type: 'application/json', limit: '1mb' }),
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
      const controller = require('./controllers/commerce/orderController');
      controller.handleRazorpayWebhook(req, res, next);
    } catch (err) {
      next(err);
    }
  },
);

// Request Parsing (MUST be before sanitization)
// Pre-validate body size before parsing to prevent CPU exhaustion on XSS sanitization
app.use((req: Request, res: Response, next) => {
  if (
    req.path.includes('/upload') ||
    req.path.includes('/webhook') ||
    req.path.includes('/visual-search') ||
    req.path.includes('/ai-autofill')
  ) {
    return next();
  }
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 51200) {
    // 50kb limit for standard JSON payloads (matches express.json limit)
    logger.warn(`[SECURITY] Blocked oversized payload (${contentLength} bytes) to ${req.path}`);
    return res.status(413).json({ success: false, message: 'Payload Too Large' });
  }
  next();
});

// 10mb is the max parsed size limit internally, but our 50kb guard catches oversized bodies for standard routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 50 }));
app.use(cookieParser());

// CSRF double-submit cookie (required for cookie-credentialed mutating requests)
app.get('/api/csrf-token', issueCsrfToken);
app.get('/api/v1/csrf-token', issueCsrfToken); // Fallback for frontend base URLs pointing to /api/v1
app.use('/api', validateCsrf);
app.use(dbReadinessGuard);

// Enforce maintenance mode globally before logging and other middlewares
app.use(maintenanceMiddleware);

// Enable production-safe structured request logging and execution telemetry
if (process.env.DISABLE_LOGGING !== 'true') {
  app.use(requestLogger);
}

// Sanitization & Performance
if (process.env.DISABLE_COMPRESSION !== 'true') {
  app.use(compression({ level: 6, threshold: 1024 }));
}
app.use(queryGuard); // Guard against complex NoSQL injection vectors (depth, raw $ operators in query)
// Express 5 makes req.query a getter, so we cannot reassign it directly.
// We apply sanitization in-place or handle it without reassignment.
app.use((req, res, next) => {
  if (process.env.DISABLE_XSS === 'true') {
    return next();
  }
  if (req.body) {
    mongoSanitize.sanitize(req.body);
    req.body = xssSanitize(req.body);
  }
  if (req.query) {
    mongoSanitize.sanitize(req.query);
    const cleaned = xssSanitize(req.query);
    for (const key in req.query) {
      delete req.query[key];
    }
    for (const key in cleaned) {
      req.query[key] = cleaned[key];
    }
  }
  if (req.params) {
    mongoSanitize.sanitize(req.params);
    const cleaned = xssSanitize(req.params);
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
  });
});

// Root-level health check endpoint supporting both GET and HEAD methods for uptime monitoring
app.head('/health', noCacheMiddleware, (req: Request, res: Response) => {
  res.status(200).end();
});

app.use(['/health', '/api/health', '/api/v1/health'], noCacheMiddleware, healthRoutes);
app.use(['/api/business-metrics', '/api/v1/business-metrics'], noCacheMiddleware, metricsRoutes);

// Lightweight limiter for public endpoints that live outside the /api mount
// (the global/flooding limiters below only attach to /api/*). Honors the same
// DISABLE_RATE_LIMITER escape hatch used for tests.
const publicEndpointLimiter =
  process.env.DISABLE_RATE_LIMITER === 'true'
    ? (_req: Request, _res: Response, next: express.NextFunction) => next()
    : apiFloodingLimiter;

// Prometheus metrics endpoint for SRE monitoring.
// In production this is token-gated and hidden (404) when the caller is not
// authorized — it exposes infrastructure internals and is otherwise free
// bandwidth for anonymous scrapers. Set METRICS_TOKEN and have the scraper send
// `Authorization: Bearer <token>`.
const metricsAccessGuard = (req: Request, res: Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const token = process.env.METRICS_TOKEN;
    const provided = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!token || provided !== token) {
      return res.status(404).end();
    }
  }
  next();
};

app.get(
  '/metrics',
  publicEndpointLimiter,
  metricsAccessGuard,
  async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', PrometheusService.getContentType());
      const metrics = await PrometheusService.getMetrics();
      res.send(metrics);
    } catch {
      res.status(500).send('Error gathering metrics');
    }
  },
);

// Readiness Probe (Tracks HTTP readiness, not DB readiness to prevent orchestrator crash loops)
app.get(['/api/readiness', '/api/v1/readiness'], noCacheMiddleware, HealthController.readiness);

// Ignore favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Dynamic sitemap.xml endpoint for SEO bots
app.get('/sitemap.xml', publicEndpointLimiter, async (req: Request, res: Response) => {
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
app.use(requestTimeout(60000));

// Apply global rate limiting and API flooding protection
if (process.env.DISABLE_RATE_LIMITER !== 'true') {
  app.use('/api/', apiFloodingLimiter);
  app.use('/api/', globalLimiter);
}

// Version endpoint — minimal public payload (no environment disclosure)
app.get(['/api/version', '/api/v1/version'], noCacheMiddleware, (req: Request, res: Response) => {
  res.json({ version: process.env.npm_package_version || '1.0.0' });
});

// Telemetry & Metrics endpoint - protected, admin-only
app.get(
  ['/api/metrics', '/api/v1/metrics'],
  requireAuth,
  requireAdmin,
  noCacheMiddleware,
  async (req: Request, res: Response) => {
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

    const pingRedis = require('./utils/cache/redis').pingRedis;
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
  },
);

// Enforce raw upload size limit before multer buffers to prevent RAM exhaustion
app.use('/api/v1/upload', (req: Request, res: Response, next: express.NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 51 * 1024 * 1024) {
    // 51MB
    return res.status(413).json({ success: false, message: 'Request payload too large' });
  }
  next();
});

// API Routes Registration
app.use('/api/docs', requireAuth, requireAdmin, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
registerApiRoutes(app, '/api/v1', 'v1');

// Sentry Error Handler (must be before any other error middleware)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global Error Handler
app.use(errorMiddleware);

export default app;
