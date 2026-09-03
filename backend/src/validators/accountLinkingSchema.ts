import { z } from 'zod';

export const linkGoogleSchema = z.object({
  body: z.object({
    credential: z.string().min(1),
  }),
});

export const linkPhoneRequestSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(15),
  }),
});

export const linkPhoneVerifySchema = z.object({
  body: z.object({
    challengeId: z.string().uuid(),
    otp: z
      .string()
      .length(6)
      .regex(/^\d{6}$/),
  }),
});

export const unlinkProviderSchema = z.object({
  params: z.object({
    provider: z.enum(['google', 'phone', 'email']),
  }),
});
