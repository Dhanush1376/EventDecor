import { Request, Response, NextFunction } from 'express';

export type ApiVersionTag = 'v1';

declare global {
  namespace Express {
    interface Request {
      /** Set by registerApiRoutes — use before shipping breaking response changes. */
      apiVersion?: ApiVersionTag;
    }
  }
}

/**
 * Tags requests with API version.
 * Gate breaking changes on `req.apiVersion === 'v1'` when diverging handlers.
 */
export const attachApiVersion = (version: ApiVersionTag) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.apiVersion = version;
    next();
  };
};
