import { Request, Response, NextFunction } from 'express';
import { getPublicCacheVersion } from '../utils/cacheVersion';

export const cacheResponse = (_durationSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const version = await getPublicCacheVersion();
      const isAuthRequest = req.headers.authorization || req.cookies?.siri_refresh_token;

      res.setHeader('ETag', `"api-v${version}"`);
      res.setHeader('Vary', 'Authorization, Cookie');

      // Never allow shared/CDN caching of authenticated responses (S-03)
      if (isAuthRequest) {
        const { applyNoCacheHeaders } = require('./noCacheMiddleware');
        applyNoCacheHeaders(res);
      } else {
        res.setHeader(
          'Cache-Control',
          `public, max-age=0, s-maxage=60, stale-while-revalidate=120`,
        );
      }
    } catch {
      res.setHeader('Cache-Control', 'no-store');
    }

    next();
  };
};
