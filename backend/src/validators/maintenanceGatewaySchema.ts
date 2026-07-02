import { z } from 'zod';

export const maintenanceAuthenticateSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

export const maintenanceVerifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    otp: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  }),
});

export const maintenanceEnableSchema = z.object({
  body: z.object({
    mode: z.enum(['public_maintenance', 'read_only', 'full_lockdown']),
    reason: z.string().min(5).max(500).optional(),
  }),
});
