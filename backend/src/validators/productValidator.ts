import { body } from 'express-validator';

export const productValidator = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('teluguTitle').optional().trim(),
  body('slug').notEmpty().withMessage('Slug is required').trim(),
  body('category').notEmpty().withMessage('Category is required').trim(),
  body('material').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
  body('oldPrice').optional().isFloat({ min: 0 }).withMessage('Old price must be 0 or greater'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be 0 or greater'),
  body('imageSrc')
    .notEmpty()
    .withMessage('Main image is required')
    .isURL()
    .withMessage('Main image must be a valid URL'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('badges').optional().isArray().withMessage('Badges must be an array'),
  body('dimensions').optional().trim(),
  body('weight').optional().trim(),
  body('seoTitle').optional().trim(),
  body('seoDescription').optional().trim(),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('showInGallery').optional().isBoolean().withMessage('showInGallery must be a boolean'),
  // Rental fields
  body('rentalEnabled').optional().isBoolean().withMessage('rentalEnabled must be a boolean'),
  body('availabilityMode')
    .optional()
    .isIn(['purchase_only', 'rent_only', 'both'])
    .withMessage('Invalid availability mode'),
  body('rentalPricing.daily')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily rate must be 0 or greater'),
  body('rentalPricing.weekly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly rate must be 0 or greater'),
  body('rentalPricing.monthly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly rate must be 0 or greater'),
  body('rentalPricing.customDurationEnabled').optional().isBoolean(),
  body('rentalPricing.customPricePerDay').optional().isFloat({ min: 0 }),
  body('securityDeposit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Security deposit must be 0 or greater'),
  body('isDepositRefundable').optional().isBoolean(),
  body('rentalStock').optional().isInt({ min: 0 }).withMessage('Rental stock must be 0 or greater'),
  body('rentalMinDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min rental days must be at least 1'),
  body('rentalMaxDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max rental days must be at least 1'),
];
