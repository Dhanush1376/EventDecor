import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../config/logger';

/**
 * Validates request payload (body, query, params) against a strictly typed Zod schema.
 * Rejects unexpected payloads or malformed data with a secure 422 response.
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse asynchronously to handle any async refinements, if present
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract validation errors securely without leaking internal schema structures
        const zodIssues = (error as any).issues || (error as any).errors || [];
        const validationErrors = zodIssues.reduce((acc: any, e: any) => {
          acc[e.path.join('.')] = e.message;
          return acc;
        }, {});

        logger.warn(`[VALIDATION_FAILED] ${req.method} ${req.originalUrl}`, {
          ip: req.ip,
          errors: validationErrors,
        });

        return res.status(422).json({
          success: false,
          message: 'Validation failed. Please verify your input.',
          errors: validationErrors,
        });
      }
      
      // If it's not a ZodError, pass it to the global error handler
      return next(error);
    }
  };
};
