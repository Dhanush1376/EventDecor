import { z } from 'zod';
import { RESOLUTIONS, RETURN_REASONS } from '../services/returns/WhatsAppReturnService';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

export const orderIdParamsSchema = z.object({
  params: z.object({ orderId: objectId }),
});

export const whatsappReturnRequestSchema = z.object({
  params: z.object({ orderId: objectId }),
  body: z
    .object({
      requestType: z.enum(['return', 'exchange']),
      items: z
        .array(
          z.object({
            itemId: objectId,
            quantity: z.number().int().min(1, 'Quantity must be at least 1'),
          }),
        )
        .min(1, 'Select at least one item')
        .max(50),
      reason: z.enum(Object.keys(RETURN_REASONS) as [keyof typeof RETURN_REASONS]),
      description: z.string().trim().max(1000, 'Description is too long').optional(),
      preferredResolution: z.enum(Object.keys(RESOLUTIONS) as [keyof typeof RESOLUTIONS]),
      imageUrls: z.array(z.string().url().max(500)).max(5, 'Up to 5 photos').optional(),
    })
    .refine((b) => new Set(b.items.map((i) => i.itemId)).size === b.items.length, {
      message: 'Each item can only be selected once',
      path: ['items'],
    })
    .refine((b) => b.reason !== 'other' || (b.description || '').trim().length >= 10, {
      message: 'Please describe the issue (at least 10 characters) when choosing "Other"',
      path: ['description'],
    }),
});
