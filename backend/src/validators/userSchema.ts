import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().optional(),
  }),
});

export const addressSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name is required').max(100),
    phone: z.string().min(10, 'Valid phone number is required').max(20),
    streetAddress: z.string().min(5, 'Street address is required').max(200),
    city: z.string().min(2, 'City is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    pinCode: z.string().min(5, 'Valid PIN/ZIP code is required').max(20),
    country: z.string().min(2, 'Country is required').max(100),
    isDefault: z.boolean().optional(),
  }),
});

export const updateAddressSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name is required').max(100).optional(),
    phone: z.string().min(10, 'Valid phone number is required').max(20).optional(),
    streetAddress: z.string().min(5, 'Street address is required').max(200).optional(),
    city: z.string().min(2, 'City is required').max(100).optional(),
    state: z.string().min(2, 'State is required').max(100).optional(),
    pinCode: z.string().min(5, 'Valid PIN/ZIP code is required').max(20).optional(),
    country: z.string().min(2, 'Country is required').max(100).optional(),
    isDefault: z.boolean().optional(),
  }),
  params: z.object({
    addressId: z.string(),
  }),
});

export const toggleWishlistSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
});

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive().optional(),
    type: z.enum(['purchase', 'rental']).optional(),
    rentalInfo: z
      .object({
        startDate: z.string(),
        endDate: z.string(),
        duration: z.number(),
      })
      .optional(),
    deposit: z.number().nonnegative().optional(),
  }),
});

export const syncCartSchema = z.object({
  body: z.object({
    cartItems: z.array(
      z.object({
        product: z.string().min(1, 'Product ID is required'),
        quantity: z.number().int().positive(),
        type: z.enum(['purchase', 'rental']).optional(),
        rentalInfo: z
          .object({
            startDate: z.string(),
            endDate: z.string(),
            duration: z.number(),
          })
          .optional(),
        deposit: z.number().nonnegative().optional(),
      }),
    ),
  }),
});

export const trackRecentlyViewedSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
});
