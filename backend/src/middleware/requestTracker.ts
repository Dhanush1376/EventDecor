import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../config/logger';

let trustProxyIpLogged = false;

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

  if (!trustProxyIpLogged) {
    trustProxyIpLogged = true;
    const forwardedFor = req.headers['x-forwarded-for'];
    logger.info('[TRUST_PROXY] First request IP verification sample', {
      trustProxyHops: process.env.TRUST_PROXY_HOPS ?? '1',
      reqIp: req.ip,
      socketRemoteAddress: req.socket.remoteAddress,
      xForwardedFor: forwardedFor || '(none)',
    });
  }

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
