import { body } from 'express-validator';

export const submitCustomOrderValidator = [
  body('occasion')
    .trim()
    .notEmpty()
    .withMessage('Occasion is required')
    .isLength({ max: 100 })
    .withMessage('Occasion must be at most 100 characters'),
  body('productType')
    .trim()
    .notEmpty()
    .withMessage('Product type is required')
    .isLength({ max: 100 })
    .withMessage('Product type must be at most 100 characters'),
  body('inspirationImages')
    .optional()
    .isArray()
    .withMessage('Inspiration images must be an array'),
  body('inspirationImages.*')
    .optional()
    .isURL()
    .withMessage('Inspiration image must be a valid URL'),
  body('customRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Custom requirements must be at most 2000 characters'),
  body('budget')
    .trim()
    .notEmpty()
    .withMessage('Budget range is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('eventDate')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Event date must be a valid ISO 8601 date'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 }),
  body('bookingType')
    .trim()
    .notEmpty()
    .withMessage('Booking consultation type is required'),
  body('customerPhone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Customer phone must be at most 20 characters'),
];
