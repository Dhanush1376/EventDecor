import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  method?: string;
  url?: string;
}

// Global async store for tracing requests in parallel
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Middleware that assigns a unique requestId to all requests,
 * sets up response tracking headers, and boots the async storage context.
 */
export const requestTrackerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);

  const context: RequestContext = {
    requestId,
    ip: req.ip || req.socket.remoteAddress,
    method: req.method,
    url: req.originalUrl || req.url,
  };

  requestContextStorage.run(context, () => {
    next();
  });
};

/**
 * Helper to dynamically enrich the active request context mid-execution (e.g. on Auth).
 */
export const updateRequestContext = (updates: Partial<RequestContext>) => {
  const store = requestContextStorage.getStore();
  if (store) {
    Object.assign(store, updates);
  }
};
