import { Request, Response, NextFunction } from 'express';

export const cacheResponse = (durationSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${durationSeconds}`);
    }
    next();
  };
};
