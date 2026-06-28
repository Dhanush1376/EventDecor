import winston from 'winston';
import { Syslog } from 'winston-syslog';
import { requestContextStorage } from '../utils/requestContext';

/**
 * Application Logger Configuration
 *
 * Implements a structured JSON logging strategy with automatic context injection
 * (requestId, userId, ip) and deep secret redaction.
 *
 * Transports:
 * - Error log: Dedicated file for error-level logs (rotated)
 * - Combined log: All standard logs (rotated)
 * - Payments log: Dedicated audit trail for transaction events (rotated, long retention)
 * - Console: JSON in production, colorized simple format in development
 * - Webhook/Syslog: Optional external drains (Datadog, Papertrail)
 */

// Winston format to dynamically extract the active context and inject request metadata
const requestContextFormat = winston.format((info) => {
  try {
    const store = requestContextStorage.getStore();
    if (store) {
      info.requestId = store.requestId;
      if (store.userId) info.userId = store.userId;
      if (store.ip) info.ip = store.ip;
    }
  } catch {
    // Fail silently to avoid interrupting application operations
  }
  return info;
});

const sensitiveKeys = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /authorization/i,
  /signature/i,
  /otp/i,
  /twoFactor/i,
  /creditCard/i,
  /cvv/i,
  /ssn/i,
  /apiKey/i,
  /cardnumber/i,
];

const secretStringPatterns = [
  /mongodb(?:\+srv)?:\/\/[^\s]+/i, // MongoDB URI
  /rzp_(?:live|test)_[a-zA-Z0-9]+/i, // Razorpay Keys
  /sk_(?:live|test)_[a-zA-Z0-9]+/i, // Stripe / Generic Secret Keys
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, // JWT
  /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})/, // Basic CC (Visa, MC, Amex, Disc)
];

const maskValue = (value: any): any => {
  if (typeof value === 'string') {
    if (value.startsWith('Bearer ')) return 'Bearer [REDACTED]';
    return '[REDACTED]';
  }
  return value;
};

const maskStringPatterns = (str: string): string => {
  if (!str || typeof str !== 'string') return str;
  if (process.env.LOG_REDACTION === 'false') return str;
  let masked = str;
  for (const pattern of secretStringPatterns) {
    masked = masked.replace(pattern, '[REDACTED_SECRET]');
  }
  return masked;
};

const standardKeys = new Set([
  'level',
  'message',
  'timestamp',
  'service',
  'requestId',
  'userId',
  'ip',
  'stack',
]);

const maskObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return maskStringPatterns(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(maskObject);
  }

  if (typeof obj === 'object') {
    if (obj instanceof Error) {
      return obj;
    }

    const masked: any = {};
    for (const key of Object.keys(obj)) {
      if (standardKeys.has(key)) {
        masked[key] = obj[key];
        continue;
      }

      const isSensitive = sensitiveKeys.some((regex) => regex.test(key));
      if (isSensitive) {
        masked[key] = maskValue(obj[key]);
      } else {
        masked[key] = maskObject(obj[key]);
      }
    }

    const symbols = Object.getOwnPropertySymbols(obj);
    for (const sym of symbols) {
      masked[sym] = obj[sym];
    }

    return masked;
  }

  return obj;
};

const secretMaskingFormat = winston.format((info) => {
  return maskObject(info);
});

const logFormat = winston.format.combine(
  requestContextFormat(),
  secretMaskingFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const productionLogLevel = process.env.LOG_LEVEL || 'warn';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : productionLogLevel,
  format: logFormat,
  defaultMeta: { service: 'siri-arts-crafts-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB limit
      maxFiles: 5, // Keep up to 5 rotated error log files
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 20 * 1024 * 1024, // 20MB limit
      maxFiles: 5, // Keep up to 5 rotated combined log files
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'logs/payments.log',
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB limit
      maxFiles: 10, // Keep up to 10 rotated payment logs for security audit trail retention
      tailable: true,
    }),
  ],
});

// Add external HTTP webhook log drain (e.g. Datadog, BetterStack)
if (process.env.LOG_WEBHOOK_URL) {
  try {
    const url = new URL(process.env.LOG_WEBHOOK_URL);
    logger.add(
      new winston.transports.Http({
        host: url.hostname,
        path: url.pathname,
        port: url.port ? parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
        ssl: url.protocol === 'https:',
        headers: {
          Authorization: `Bearer ${process.env.LOG_WEBHOOK_TOKEN || ''}`,
          'Content-Type': 'application/json',
        },
        format: winston.format.combine(
          requestContextFormat(),
          secretMaskingFormat(),
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  } catch (_e) {
    logger.error('Invalid LOG_WEBHOOK_URL provided.');
  }
}

// Add Papertrail / Syslog drain
if (process.env.PAPERTRAIL_URL && process.env.PAPERTRAIL_PORT) {
  logger.add(
    new Syslog({
      host: process.env.PAPERTRAIL_URL,
      port: parseInt(process.env.PAPERTRAIL_PORT, 10),
      app_name: 'siri-arts-backend',
      localhost: 'production-env',
      format: winston.format.combine(
        requestContextFormat(),
        secretMaskingFormat(),
        winston.format.json(),
      ),
    }),
  );
}

// Production: stdout JSON for Render/log drains (file transports are best-effort on ephemeral disks)
logger.add(
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'production'
        ? winston.format.combine(
            requestContextFormat(),
            secretMaskingFormat(),
            winston.format.timestamp(),
            winston.format.json(),
          )
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
);

export default logger;
