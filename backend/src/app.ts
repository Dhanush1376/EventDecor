import express, { Application, Request, Response } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { handleRazorpayWebhook } from './controllers/orderController';
import rateLimit from 'express-rate-limit';
import errorMiddleware from './middleware/errorMiddleware';
import productRoutes from './routes/productRoutes';
import uploadRoutes from './routes/uploadRoutes';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import orderRoutes from './routes/orderRoutes';
import cmsRoutes from './routes/cmsRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import galleryRoutes from './routes/galleryRoutes';
import reviewRoutes from './routes/reviewRoutes';
import couponRoutes from './routes/couponRoutes';
import userRoutes from './routes/userRoutes';
import inquiryRoutes from './routes/inquiryRoutes';
import notificationRoutes from './routes/notificationRoutes';
import customOrderRoutes from './routes/customOrderRoutes';
import loyaltyRoutes from './routes/loyaltyRoutes';
import eventBookingRoutes from './routes/eventBookingRoutes';
import showcaseRoutes from './routes/showcaseRoutes';
import logger from './config/logger';
import { generateSitemap } from './utils/sitemapGenerator';
import * as Sentry from "@sentry/node";
import { requestTrackerMiddleware } from './middleware/requestTracker';
import { requestLogger } from './middleware/requestLogger';

// Use require for the inner xss-clean function
const { clean: xssClean } = require('xss-clean/lib/xss');

// Initialize dotenv
dotenv.config();

const app: Application = express();

// Disable x-powered-by to prevent tech stack signature disclosure
app.disable('x-powered-by');

// Trust proxy for accurate rate limiting (especially on Render/Vercel)
app.set('trust proxy', 1);

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://www.gravatar.com", "https://*.cloudinary.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lux.razorpay.com", ...(process.env.SENTRY_DSN ? ["https://*.sentry.io"] : [])],
      frameSrc: ["'self'", "https://api.razorpay.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// Permissions-Policy: restrict sensitive browser APIs
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), interest-cohort=()');
  next();
});

// 2. CORS Configuration
const allowedOrigins = (process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'])
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)
  .flatMap((origin) => {
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      return [`https://${origin}`, `http://${origin}`];
    }
    return [origin];
  });
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: Origin "${origin}" is not in the allowed list: [${allowedOrigins.join(', ')}]`));
    }
  },
  credentials: true,
}));

app.use((req, res, next) => {
  const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!mutatingMethod || process.env.NODE_ENV === 'development') {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: `Request origin "${origin || 'unknown'}" is not allowed. Allowed: [${allowedOrigins.join(', ')}]`,
  });
});

// ─── Razorpay Webhook (MUST be registered BEFORE body parsing middleware) ───
// Razorpay HMAC signature verification requires the raw, unparsed request body.
// Parsing with express.json() + XSS sanitization corrupts the payload and breaks signature checks.
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response, next) => {
  // Convert raw Buffer to parsed JSON for the controller, preserving the original raw body for HMAC
  (req as any).rawBody = req.body;
  req.body = JSON.parse(req.body.toString());
  next();
}, handleRazorpayWebhook);

// 3. Request Parsing (MUST be before sanitization)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (err: any) {
    logger.error(`[APP SITEMAP ROUTE ERROR] ${err.message}`);
    res.status(500).type('text/plain').send('Error serving dynamic sitemap');
  }
});

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit for auth routes (login/register/otp)
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 OTP requests per 10 minutes
  message: 'Too many OTP requests from this IP. Please try again after 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production') {
  app.use('/api/', globalLimiter);
  app.use('/api/auth/send-otp', otpSendLimiter);
  app.use('/api/auth', authLimiter);
} else {
  // Relaxed rate limiter for non-production to catch integration bugs early
  const devLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
  app.use('/api/', devLimiter);
}


// 5. Caching & Performance telemetry already loaded above


// 6. Health Check (Centralized observibility for system and DB health status)
app.get('/api/health', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  
  const dbState = mongoose.connection.readyState;
  // State description: 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const dbStatus = dbState === 1 ? 'UP' : 'DOWN';
  
  const healthData = {
    success: dbState === 1,
    status: dbState === 1 ? 'healthy' : 'degraded',
    message: 'Siri Arts API Status',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      state: dbState
    },
    system: {
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usage: `${Math.round((1 - os.freemem() / os.totalmem()) * 100)}%`
      },
      cpuLoad: os.loadavg()
    }
  };

  if (dbState !== 1) {
    logger.error('🏥 HEALTHCHECK FAILED: MongoDB is unreachable or degraded', healthData);
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

// Version endpoint for deployment verification
app.get('/api/version', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ version: process.env.npm_package_version || '1.0.0', environment: process.env.NODE_ENV || 'development' });
});

// 7. API Routes
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/custom-orders', customOrderRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/event-bookings', eventBookingRoutes);
app.use('/api/showcases', showcaseRoutes);

// 8. Sentry Error Handler (must be before any other error middleware)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// 9. Global Error Handler
app.use(errorMiddleware);

export default app;
