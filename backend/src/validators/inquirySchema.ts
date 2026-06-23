import { z } from 'zod';
import { canonicalizeEmail } from '../utils/email/emailHelper';

export const submitInquirySchema = z.object({
  body: z
    .object({
      name: z
        .string({ message: 'Name is required' })
        .trim()
        .min(1, 'Name is required')
        .max(120, 'Name must be at most 120 characters'),
      email: z
        .string({ message: 'Email is required' })
        .trim()
        .min(1, 'Email is required')
        .email('Valid email is required')
        .transform((val) => canonicalizeEmail(val)),
      phone: z
        .string()
        .trim()
        .max(20, 'Phone must be at most 20 characters')
        .optional()
        .or(z.literal('')),
      subject: z
        .string({ message: 'Subject is required' })
        .trim()
        .min(1, 'Subject is required')
        .max(200, 'Subject must be at most 200 characters'),
      message: z
        .string({ message: 'Message is required' })
        .trim()
        .min(1, 'Message is required')
        .max(5000, 'Message must be at most 5000 characters'),
    })
    .strict(),
});

export const updateInquiryStatusSchema = z.object({
  body: z
    .object({
      status: z.enum(['new', 'read', 'resolved'], {
        message: 'Invalid status. Allowed values: new, read, resolved',
      }),
    })
    .strict(),
});
