import { z } from 'zod';
import { canonicalizeEmail } from '../utils/emailHelper';

const emailSchema = z
  .string({ message: 'Email address is required' })
  .trim()
  .min(1, 'Email address is required')
  .email('Please provide a valid email address')
  .transform((val) => canonicalizeEmail(val));

export const sendOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
  }).strict(), // Reject any other payload properties
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).replace(/\D/g, '').slice(0, 6))
      .refine((val) => val.length === 6, {
        message: 'Verification code must be exactly 6 digits',
      }),
  }).strict(),
});

export const refreshSessionSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(32, 'Refresh token must be a valid string')
      .max(256, 'Refresh token must be a valid string')
      .optional()
      .or(z.literal('')),
  }).strict(),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(32, 'Refresh token must be a valid string')
      .max(256, 'Refresh token must be a valid string')
      .optional()
      .or(z.literal('')),
  }).strict(),
});

export const twoFactorVerifyLoginSchema = z.object({
  body: z.object({
    userId: z
      .string({ message: 'userId is required' })
      .min(1, 'userId is required')
      .max(64, 'userId must be a valid identifier'),
    token: z
      .string({ message: 'Authenticator code is required' })
      .min(6, 'Authenticator code must be 6 digits')
      .max(6, 'Authenticator code must be 6 digits')
      .regex(/^\d{6}$/, 'Authenticator code must be exactly 6 digits'),
  }).strict(),
});
