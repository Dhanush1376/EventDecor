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
    const originalSend = res.send;
    res.send = function (body) {
      if (!res.getHeader('Cache-Control')) {
        // Only cache public/static API responses that don't depend on user authentication
        // We assume routes ending in /cms, /products (lists), or public gallery can be cached.
        const path = req.originalUrl || req.url;
        const isPublicCacheable =
          path.includes('/cms') || path.includes('/products') || path.includes('/gallery');

        if (isPublicCacheable && !req.headers.authorization && !req.cookies?.token) {
          // Cloudflare & Browser caching: public, cache for 1 hour
          res.setHeader(
            'Cache-Control',
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          );
        } else {
          res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        }
      }
      return originalSend.call(this, body);
    };
  }

  next();
};
