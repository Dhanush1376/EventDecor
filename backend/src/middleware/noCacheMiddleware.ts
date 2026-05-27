import { Request, Response, NextFunction } from 'express';

/**
 * Helper to apply aggressive no-cache headers to a response.
 */
export const applyNoCacheHeaders = (res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

/**
 * Middleware to aggressively prevent caching of the response.
 * Used for sensitive routes like auth, admin, payments, and dashboards.
 */
export const noCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  applyNoCacheHeaders(res);
  next();
};
