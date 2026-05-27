import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Helper to measure the nesting depth of an object.
 */
const getObjectDepth = (obj: any): number => {
  if (obj == null || typeof obj !== 'object') {
    return 0;
  }
  let maxDepth = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      maxDepth = Math.max(maxDepth, getObjectDepth(obj[key]));
    }
  }
  return maxDepth + 1;
};

/**
 * Helper to check if any key in an object (or its nested properties) starts with a specific character (e.g., '$').
 */
const hasKeyStartingWith = (obj: any, char: string): boolean => {
  if (obj == null || typeof obj !== 'object') {
    return false;
  }
  if (Array.isArray(obj)) {
    return obj.some(item => hasKeyStartingWith(item, char));
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key.startsWith(char)) {
        return true;
      }
      if (hasKeyStartingWith(obj[key], char)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Middleware to guard against complex NoSQL injection vectors.
 * 
 * 1. Checks request query and body for maximum nesting depth (mitigates nested $where / $expr attacks).
 * 2. Checks request query for raw '$' operators. URL params shouldn't contain MongoDB operators directly.
 *    (express-mongo-sanitize handles the body/params well, but URL queries are sometimes bypassed or parsed weirdly).
 */
export const queryGuard = (req: Request, res: Response, next: NextFunction): void => {
  const MAX_DEPTH = 5;

  // 1. Guard against deeply nested objects in body or query
  if (req.body && getObjectDepth(req.body) > MAX_DEPTH) {
    logger.warn(`[SECURITY] Blocked request due to excessive body nesting depth from IP: ${req.ip}`);
    res.status(400).json({ success: false, message: 'Invalid payload structure (too deep)' });
    return;
  }

  if (req.query && getObjectDepth(req.query) > MAX_DEPTH) {
    logger.warn(`[SECURITY] Blocked request due to excessive query nesting depth from IP: ${req.ip}`);
    res.status(400).json({ success: false, message: 'Invalid query structure (too deep)' });
    return;
  }

  // 2. Reject explicit $ operators in the URL query string
  // express-mongo-sanitize strips these, but it's safer to explicitly reject them at the network edge
  if (req.query && hasKeyStartingWith(req.query, '$')) {
    logger.warn(`[SECURITY] Blocked request containing '$' operators in URL query from IP: ${req.ip}, URL: ${req.originalUrl}`);
    res.status(400).json({ success: false, message: 'Invalid query parameters' });
    return;
  }

  next();
};
