import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID format')
    .optional(),
  showcaseId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid showcase ID format')
    .optional(),
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z
    .string()
    .trim()
    .min(5, 'Review comment must be at least 5 characters')
    .max(2000, 'Comment is too long'),
  images: z
    .array(z.string().url('Invalid image URL format'))
    .max(5, 'Maximum 5 images allowed')
    .optional(),
  location: z.string().trim().max(100).optional(),
  eventType: z.string().trim().max(100).optional(),
  favoriteElement: z.string().trim().max(100).optional(),
  category: z.enum(['showcase', 'event', 'product']).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z
    .string()
    .trim()
    .min(5, 'Review comment must be at least 5 characters')
    .max(2000, 'Comment is too long'),
  images: z
    .array(z.string().url('Invalid image URL format'))
    .max(5, 'Maximum 5 images allowed')
    .optional(),
});
