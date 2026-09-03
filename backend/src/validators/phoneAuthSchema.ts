import { z } from 'zod';

export const phoneOtpRequestSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(15),
    countryCode: z.string().default('IN').optional(),
  }),
});

export const phoneOtpVerifySchema = z.object({
  body: z.object({
    challengeId: z.string().uuid(),
    otp: z
      .string()
      .length(6)
      .regex(/^\d{6}$/),
  }),
});
