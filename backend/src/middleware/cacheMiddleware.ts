import { Request, Response, NextFunction } from 'express';
import { getPublicCacheVersion } from '../utils/cacheVersion';

export const cacheResponse = (durationSeconds: number) => {
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
        res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', `public, max-age=${durationSeconds}, must-revalidate`);
      }
    } catch {
      res.setHeader('Cache-Control', 'no-store');
    }

    next();
  };
};
