import { z } from 'zod';

export const initializeCheckoutSchema = z.object({
  body: z.object({
    eventPackageId: z.string().optional(),
    eventType: z.string().optional(),
    title: z.string().optional(),
    date: z.string().or(z.date()),
    rentalDurationDays: z.number().or(z.string()).optional(),
    timing: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    guestCount: z.number().or(z.string()).optional(),
    venue: z.object({
      address: z.string().optional(),
      isOutdoor: z.boolean().optional(),
    }).optional(),
    customization: z.record(z.string(), z.any()).optional(),
    selectedAddons: z.array(z.object({
      name: z.string(),
      id: z.string().optional(),
    })).optional(),
    inspirationImages: z.array(z.string()).optional(),
  }),
});

export const submitBookingSchema = initializeCheckoutSchema;
