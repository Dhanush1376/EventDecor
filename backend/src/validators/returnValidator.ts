import { z } from 'zod';

export const createReturnSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    refundMethod: z.enum(['original', 'wallet', 'store_credit']).optional(),
    pickupAddress: z.any().optional(),
    idempotencyKey: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Product ID is required'),
          returnQuantity: z.number().int().min(1, 'Quantity must be at least 1'),
          reason: z.string().min(1, 'Reason is required'),
          description: z.string().optional(),
          evidenceImages: z.array(z.string()).optional(),
          evidenceVideos: z.array(z.string()).optional(),
        }),
      )
      .min(1, 'At least one item must be returned'),
  }),
});

export const inspectionChecklistSchema = z.object({
  body: z.object({
    originalProduct: z.boolean(),
    accessoriesPresent: z.boolean(),
    packagingIntact: z.boolean(),
    workingCondition: z.boolean(),
    photos: z.array(z.string()).optional(),
    remarks: z.string().optional(),
    inspectionScore: z.number().min(0).max(100),
  }),
});

export const rejectReturnSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Rejection reason is required'),
  }),
});

export const transitionStatusSchema = z.object({
  body: z.object({
    nextStatus: z.enum([
      'submitted',
      'approved',
      'pickup_assigned',
      'pickup_accepted',
      'picked_up',
      'reached_warehouse',
      'inspection_started',
      'inspection_passed',
      'refund_triggered',
      'completed',
      'rejected',
      'cancelled',
    ]),
  }),
});

export const createExchangeSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    originalProductId: z.string().min(1, 'Original Product ID is required'),
    replacementProductId: z.string().min(1, 'Replacement Product ID is required'),
    exchangeType: z.enum(['size', 'color', 'variant', 'different_product']),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    pickupAddress: z.any().optional(),
    idempotencyKey: z.string().optional(),
  }),
});
