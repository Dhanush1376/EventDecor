import { z } from 'zod';

export const googleAuthSchema = z.object({
  body: z
    .object({
      credential: z
        .string({ message: 'Google credential is required' })
        .min(100, 'Invalid Google credential token'),
    })
    .strict(),
});
