import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().optional(),
  }),
});

export const addressSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').max(100),
    phone: z.string().min(10, 'Valid phone number is required').max(20),
    alternatePhone: z.string().max(20).optional(),
    email: z.string().email('Valid email address is required').max(100).optional(),
    pincode: z.string().min(5, 'Valid PIN/ZIP code is required').max(20),
    locality: z.string().min(2, 'Locality is required').max(100),
    addressString: z.string().min(1, 'Address is required').max(200),
    landmark: z.string().max(100).optional(),
    city: z.string().min(2, 'City is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    country: z.string().min(2, 'Country is required').max(100).optional(),
    tag: z.string().max(20).optional(),
    isDefault: z.boolean().optional(),
    deliveryInstructions: z.string().max(500).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
  }),
});

export const updateAddressSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').max(100).optional(),
    phone: z.string().min(10, 'Valid phone number is required').max(20).optional(),
    alternatePhone: z.string().max(20).optional(),
    email: z.string().email('Valid email address is required').max(100).optional(),
    pincode: z.string().min(5, 'Valid PIN/ZIP code is required').max(20).optional(),
    locality: z.string().min(2, 'Locality is required').max(100).optional(),
    addressString: z.string().min(1, 'Address is required').max(200).optional(),
    landmark: z.string().max(100).optional(),
    city: z.string().min(2, 'City is required').max(100).optional(),
    state: z.string().min(2, 'State is required').max(100).optional(),
    country: z.string().min(2, 'Country is required').max(100).optional(),
    tag: z.string().max(20).optional(),
    isDefault: z.boolean().optional(),
    deliveryInstructions: z.string().max(500).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
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
    customizationNote: z.string().max(2000).optional(),
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
        customizationNote: z.string().max(2000).optional(),
      }),
    ),
  }),
});

export const trackRecentlyViewedSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
});
