import { z } from 'zod';

export const createProductSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    teluguTitle: z.string().optional(),
    customerNote: z.string().max(2000).optional(),
    complimentaryGift: z
      .object({
        enabled: z.boolean().optional(),
        name: z.string().max(100).optional(),
        quantity: z.number().min(1).optional(),
        description: z.string().max(500).optional(),
        displayBadge: z.string().max(50).optional(),
      })
      .optional(),
    slug: z.string().min(2, 'Slug must be at least 2 characters'),
    category: z.string().min(2, 'Category is required'),
    material: z.string().optional(),
    tags: z.array(z.string()).optional(),
    price: z.number().min(0, 'Price must be positive'),
    oldPrice: z.number().min(0).optional(),
    rating: z.number().min(0).max(5).optional(),
    reviews: z.number().min(0).optional(),
    imageSrc: z.string().min(1, 'Image source is required'),
    images: z.array(z.string()).max(4).optional(),
    description: z.string().min(5, 'Description is required'),
    badges: z.array(z.string()).optional(),
    dimensions: z.string().optional(),
    weight: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    stock: z.number().min(0).optional(),
    lowStockThreshold: z.number().min(0).optional(),
    featured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isNonRefundable: z.boolean().optional(),
    showInGallery: z.boolean().optional(),
    rentalEnabled: z.boolean().optional(),
    availabilityMode: z.enum(['purchase_only', 'rent_only', 'both']).optional(),
    rentalPricing: z
      .object({
        daily: z.number().min(0).optional(),
        weekly: z.number().min(0).optional(),
        monthly: z.number().min(0).optional(),
        customDurationEnabled: z.boolean().optional(),
        customPricePerDay: z.number().min(0).optional(),
      })
      .optional(),
    securityDeposit: z.number().min(0).optional(),
    isDepositRefundable: z.boolean().optional(),
    rentalStock: z.number().min(0).optional(),
    rentalMinDays: z.number().min(1).optional(),
    rentalMaxDays: z.number().min(1).optional(),
    isManualRentalPricing: z.boolean().optional(),
    customizationConfig: z
      .object({
        enabled: z.boolean().optional(),
        required: z.boolean().optional(),
        label: z.string().max(100).optional(),
        placeholder: z.string().max(200).optional(),
        maxLength: z.number().min(1).max(2000).optional(),
        helperText: z.string().max(500).optional(),
      })
      .optional(),
    variants: z.array(z.any()).optional(),
  })
  .strict();

export const updateProductSchema = createProductSchema.partial();
