import { z } from 'zod';

export const initializeCheckoutSchema = z.object({
  body: z.object({
    eventPackageId: z.string().optional(),
    eventType: z.string().min(1, 'Event type is required'),
    title: z.string().min(1, 'Booking title is required'),
    date: z
      .string()
      .or(z.date())
      .refine(
        (val) => {
          const selectedDate = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDate >= today;
        },
        { message: 'Event date cannot be in the past' },
      ),
    rentalDurationDays: z.number().or(z.string()).optional(),
    timing: z
      .object({
        start: z.string().optional(),
        end: z.string().optional(),
      })
      .optional(),
    guestCount: z.number().or(z.string()).optional(),
    venue: z.object({
      address: z.string().min(1, 'Venue address is required'),
      isOutdoor: z.boolean().optional(),
    }),
    customization: z.record(z.string(), z.any()).optional(),
    selectedAddons: z
      .array(
        z.object({
          name: z.string(),
          id: z.string().optional(),
        }),
      )
      .optional(),
    inspirationImages: z.array(z.string()).optional(),
  }),
});

export const submitBookingSchema = initializeCheckoutSchema;
