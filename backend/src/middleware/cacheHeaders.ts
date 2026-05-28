import { Request, Response, NextFunction } from 'express';

/**
 * Global cache header middleware to optimize frontend rendering and API caching.
 * Ensures that API responses are not cached aggressively by default unless specified,
 * but allows static assets or specific endpoints to cache efficiently.
 */
export const cacheHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if headers have already been sent
  if (res.headersSent) {
    return next();
  }

  // Prevent caching for API mutating requests (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    return next();
  }

  // By default, for GET requests on the API, apply a short baseline cache or rely on endpoint-specific caching
  if (req.method === 'GET') {
    // We only set this if the endpoint hasn't already set a Cache-Control header
    const originalSend = res.send;
    res.send = function (body) {
      if (!res.getHeader('Cache-Control')) {
        // Default API cache: private, max-age=0, must-revalidate
        // This ensures the browser validates with the server (ETag) but doesn't cache stale data
        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
      }
      return originalSend.call(this, body);
    };
  }

  next();
};
