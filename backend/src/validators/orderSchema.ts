import { z } from 'zod';
import { canonicalizeEmail } from '../utils/email/emailHelper';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID');

export const createOrderSchema = z.object({
  body: z
    .object({
      items: z
        .array(
          z
            .object({
              productId: objectIdSchema,
              quantity: z.number().int().min(1, 'Quantity must be at least 1'),
              type: z.string().optional(),
              variant: z.string().trim().max(100).optional().or(z.literal('')),
              customizationNote: z.string().trim().max(2000).optional().or(z.literal('')),
            })
            .strict(),
        )
        .min(1, 'Order must contain at least one item'),
      shippingAddress: z
        .object({
          name: z.string().trim().min(1, 'Name is required'),
          phone: z.string().trim().min(1, 'Mobile number is required'),
          alternatePhone: z.string().trim().optional().or(z.literal('')),
          email: z
            .string()
            .trim()
            .email('Please provide a valid email address')
            .transform((val) => canonicalizeEmail(val)),
          pincode: z.string().trim().length(6, 'Pincode must be 6 digits'),
          locality: z.string().trim().min(1, 'Locality is required'),
          address: z.string().trim().min(1, 'Address is required'),
          landmark: z.string().trim().optional().or(z.literal('')),
          city: z.string().trim().min(1, 'City is required'),
          state: z.string().trim().min(1, 'State is required'),
          country: z.string().trim().min(1, 'Country is required'),
          type: z.enum(['home', 'work', 'other']).optional(),
          deliveryInstructions: z.string().trim().max(500).optional().or(z.literal('')),
        })
        .strict(),
      couponCode: z.string().trim().max(50).optional().or(z.literal('')),

      needByDate: z.string().trim().max(50).optional().or(z.literal('')),
      paymentMethod: z.enum(['razorpay', 'cod']).default('razorpay'),
      useWallet: z.boolean().optional(),
      idempotencyKey: z.string().trim().max(120).optional(),
      orderType: z.string().optional(),
      isCustomOrder: z.boolean().optional(),
      customOrderId: z.string().optional(),
    })
    .strict(),
});

export const verifyPaymentSchema = z.object({
  body: z
    .object({
      razorpay_order_id: z.string().trim().max(200).optional(),
      razorpayOrderId: z.string().trim().max(200).optional(),
      razorpay_payment_id: z.string().trim().max(200).optional(),
      razorpayPaymentId: z.string().trim().max(200).optional(),
      razorpay_signature: z.string().trim().max(500).optional(),
      razorpaySignature: z.string().trim().max(500).optional(),
    })
    .refine(
      (data) => {
        const hasOrder = data.razorpay_order_id || data.razorpayOrderId;
        const hasPayment = data.razorpay_payment_id || data.razorpayPaymentId;
        return hasOrder && hasPayment;
      },
      {
        message: 'razorpay order id and payment id are required',
      },
    ),
});

export const validateTotalsSchema = z.object({
  body: z
    .object({
      items: z
        .array(
          z
            .object({
              productId: objectIdSchema,
              quantity: z.number().int().min(1).max(99, 'Quantity must be between 1 and 99'),
              type: z.string().optional(),
            })
            .strict(),
        )
        .min(1, 'Items array is required'),
      couponCode: z.string().trim().max(50).optional().or(z.literal('')),
      paymentMethod: z.string().trim().optional(),
      useWallet: z.boolean().optional(),
    })
    .strict(),
});

const codOtpEmailSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .email('Valid email required')
    .transform((val) => canonicalizeEmail(val)),
});

export const codOtpEmailBodySchema = z.object({
  body: codOtpEmailSchema.strict(),
});

export const codOtpVerifySchema = z.object({
  body: codOtpEmailSchema
    .extend({
      otp: z
        .union([z.string(), z.number()])
        .transform((val) => String(val).trim())
        .refine((val) => val.length === 6, {
          message: 'OTP must be exactly 6 digits. Check if your input was cut short.',
        })
        .refine((val) => /^\d+$/.test(val), {
          message: 'OTP must contain only numbers',
        }),
    })
    .strict(),
});

export const updateStatusSchema = z.object({
  body: z
    .object({
      status: z.enum(
        [
          'Pending',
          'Confirmed',
          'Processing',
          'Delivered',
          'Cancelled',
          'Returned',
          'Refunded',
          'Settled',
        ],
        {
          message: 'Invalid order status',
        },
      ),
      note: z.string().trim().max(1000).optional().or(z.literal('')),
      courierCharges: z.number().min(0).optional(),
    })
    .strict(),
});
