import { z } from 'zod';

export const recommendationQuerySchema = z.object({
  page: z.string().max(50).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  offset: z.coerce.number().min(0).optional(),
  targetType: z.enum(['product', 'event', 'gallery', 'showcase']).optional(),
  feed: z.string().max(50).optional(),
});

export const recommendationParamsSchema = z.object({
  targetType: z.enum(['product', 'event', 'gallery', 'showcase']).optional(),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid object ID format').optional(),
});
