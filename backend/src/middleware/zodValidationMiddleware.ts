import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../config/logger';

/**
 * Helper to determine if the Zod schema is nested (i.e. expects { body, query, params })
 */
const isNestedSchema = (schema: any): boolean => {
  let current = schema;
  while (current) {
    if (current._def && current._def.schema) {
      current = current._def.schema;
    } else if (current.shape) {
      return 'body' in current.shape || 'query' in current.shape || 'params' in current.shape;
    } else {
      break;
    }
  }
  return false;
};

/**
 * Validates request payload (body, query, params) against a strictly typed Zod schema.
 * Rejects unexpected payloads or malformed data with a secure 422 response.
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (isNestedSchema(schema)) {
        // Validate request body, query and params asynchronously
        const parsed = (await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        })) as any;

        if (parsed.body !== undefined) req.body = parsed.body;

        if (parsed.query !== undefined) {
          try {
            req.query = parsed.query;
          } catch (e) {
            // Fallback: Mutate query object if it has only a getter
            for (const key of Object.keys(req.query)) {
              delete req.query[key];
            }
            Object.assign(req.query, parsed.query);
          }
        }

        if (parsed.params !== undefined) {
          try {
            req.params = parsed.params;
          } catch (e) {
            // Fallback: Mutate params object if it has only a getter
            for (const key of Object.keys(req.params)) {
              delete req.params[key];
            }
            Object.assign(req.params, parsed.params);
          }
        }
      } else {
        // Validate request body directly against the flat schema
        req.body = await schema.parseAsync(req.body);
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract validation errors securely without leaking internal schema structures
        const zodIssues = (error as any).issues || (error as any).errors || [];
        const validationErrors = zodIssues.reduce((acc: any, e: any) => {
          acc[e.path.join('.')] = e.message;
          return acc;
        }, {});

        const errorMessages = Object.values(validationErrors).join(', ');

        logger.warn(`[VALIDATION_FAILED] ${req.method} ${req.originalUrl}`, {
          ip: req.ip,
          errors: validationErrors,
        });

        return res.status(422).json({
          success: false,
          message: `Validation failed: ${errorMessages || 'Please verify your input.'}`,
          errors: validationErrors,
        });
      }

      // If it's not a ZodError, pass it to the global error handler
      return next(error);
    }
  };
};
