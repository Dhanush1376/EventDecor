import winston from 'winston';
import path from 'path';
import { requestContextStorage } from '../middleware/requestTracker';

// Winston format to dynamically extract the active context and inject request metadata
const requestContextFormat = winston.format((info) => {
  try {
    const store = requestContextStorage.getStore();
    if (store) {
      info.requestId = store.requestId;
      if (store.userId) info.userId = store.userId;
      if (store.ip) info.ip = store.ip;
    }
  } catch (err) {
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
  /twoFactor/i
];

const maskValue = (value: any): any => {
  if (typeof value === 'string') {
    if (value.startsWith('Bearer ')) return 'Bearer [REDACTED]';
    return '[REDACTED]';
  }
  return value;
};

const standardKeys = new Set(['level', 'message', 'timestamp', 'service', 'requestId', 'userId', 'ip', 'stack']);

const maskObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
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
      
      const isSensitive = sensitiveKeys.some(regex => regex.test(key));
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
  winston.format.json()
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

// Production: stdout JSON for Render/log drains (file transports are best-effort on ephemeral disks)
logger.add(new winston.transports.Console({
  format: process.env.NODE_ENV === 'production'
    ? winston.format.combine(
        requestContextFormat(),
        secretMaskingFormat(),
        winston.format.timestamp(),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
}));

export default logger;
