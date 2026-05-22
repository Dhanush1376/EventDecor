import { Request, Response, NextFunction } from 'express';

export type ApiVersionTag = 'v1' | 'legacy';

declare global {
  namespace Express {
    interface Request {
      /** Set by registerApiRoutes — use before shipping breaking response changes. */
      apiVersion?: ApiVersionTag;
    }
  }
}

/**
 * Tags requests with API version. Legacy `/api` mirrors `/api/v1` today;
 * gate breaking changes on `req.apiVersion === 'v1'` when diverging handlers.
 */
export const attachApiVersion = (version: ApiVersionTag) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.apiVersion = version;
    if (version === 'legacy' && process.env.NODE_ENV === 'production') {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Link', '</api/v1>; rel="successor-version"');
    }
    next();
  };
};
