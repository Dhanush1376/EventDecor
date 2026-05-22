import { Request, Response, NextFunction } from 'express';

/**
 * Redirect HTTP to HTTPS in production when the reverse proxy sets X-Forwarded-Proto.
 * Render and most PaaS providers terminate TLS at the edge; this guards bare Docker/nginx misconfig.
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() !== 'https') {
    const host = req.headers.host || 'localhost';
    res.redirect(301, `https://${host}${req.originalUrl}`);
    return;
  }

  next();
};
