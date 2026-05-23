import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Gracefully translate CORS verification failures to 403 JSON responses
  if (typeof err.message === 'string' && err.message.startsWith('Not allowed by CORS')) {
    statusCode = 403;
    message = 'CORS Policy Violation: Request from origin is not allowed.';
  }

  // Mongoose bad ObjectId
  else if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with id of ${err.value}`;
  }

  // Mongoose duplicate key
  else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Mongoose validation error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = Object.values(err.errors || {}).map((e: any) => e.message);
    message = `Validation failed: ${validationErrors.join(', ')}`;
    errors = Object.keys(err.errors || {}).reduce((acc: any, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  // Handle JWT Malformed or Signature Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Session invalid. Please log in again.';
  }

  // Handle JWT Expiration Errors
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
  }

  // Multer upload errors
  else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size is too large. Please upload a smaller image.';
  }

  // Handle custom ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Production Error Masking: Prevent structural system detail leaks for unhandled exceptions
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && statusCode === 500 && !(err instanceof ApiError)) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  // Log error with request correlation context
  logger.error(`[API Exception] ${req.method} ${req.originalUrl} - Status ${statusCode} - ${message}`, {
    error: {
      name: err.name || 'Error',
      message: err.message || message,
      stack: err.stack,
      errors,
    }
  });

  // Report unhandled 500 errors to Sentry if integration is configured
  if (statusCode === 500 && process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(err);
    } catch {
      // Sentry initialization is lazy or missing
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: !isProduction ? err.stack : undefined,
  });
};

export default errorMiddleware;
