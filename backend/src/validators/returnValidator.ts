import { z } from 'zod';

export const createReturnSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    refundMethod: z.enum(['original', 'wallet', 'store_credit']).optional(),
    upiId: z.string().optional(),
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

const VALID_RETURN_STATUSES = [
  'approved',
  'return_courier_assigned',
  'return_picked_up',
  'return_in_transit',
  'return_received',
  'inspection_started',
  'inspection_completed',
  'refund_initiated',
  'refund_completed',
  'completed',
  'rejected',
  'cancelled',
] as const;

export const transitionStatusSchema = z.object({
  body: z
    .object({
      nextStatus: z.enum(VALID_RETURN_STATUSES).optional(),
      status: z.enum(VALID_RETURN_STATUSES).optional(),
      reason: z.string().optional(),
      metadata: z.any().optional(),
    })
    .refine((data) => data.nextStatus || data.status, {
      message: 'Either nextStatus or status is required',
    }),
});

export const createExchangeSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    originalProductId: z.string().min(1, 'Original Product ID is required'),
    replacementProductId: z.string().min(1, 'Replacement Product ID is required'),
    exchangeType: z.enum(['size', 'color', 'variant', 'different_product']),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    reason: z.string().min(1, 'Reason is required'),
    pickupAddress: z.any().optional(),
    idempotencyKey: z.string().optional(),
    refundMethod: z.enum(['original', 'wallet', 'store_credit']).optional(),
    upiId: z.string().optional(),
  }),
});
