import { body } from 'express-validator';
import { mongoIdParam } from './commonValidator';

const CUSTOM_ORDER_STATUSES = [
  'Pending',
  'Reviewing',
  'Quote Sent',
  'Approved',
  'In Progress',
  'Ready',
  'Delivered',
  'Cancelled',
] as const;

const PRIORITIES = ['low', 'medium', 'high'] as const;

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

export const customOrderIdParam = mongoIdParam('id');

export const adminUpdateCustomOrderStatusValidator = [
  ...customOrderIdParam,
  body('status').trim().notEmpty().isIn([...CUSTOM_ORDER_STATUSES]),
];

export const adminUpdatePriorityValidator = [
  ...customOrderIdParam,
  body('priority').trim().notEmpty().isIn([...PRIORITIES]),
];

export const adminCustomOrderNotesValidator = [
  ...customOrderIdParam,
  body('adminNotes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
];

export const adminCustomOrderQuotationValidator = [
  ...customOrderIdParam,
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().isLength({ max: 200 }),
  body('items.*.price').optional().isFloat({ min: 0 }),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('shipping').optional().isFloat({ min: 0 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['draft', 'sent', 'approved', 'rejected']),
];

export const customerQuotationRespondValidator = [
  ...customOrderIdParam,
  body('status').trim().notEmpty().isIn(['approved', 'rejected']),
];

export const customOrderMessageValidator = [
  ...customOrderIdParam,
  body('text').trim().notEmpty().isLength({ max: 5000 }),
  body('attachments').optional().isArray(),
  body('attachments.*').optional().isURL(),
];

export const adminArchiveOrderValidator = [
  ...customOrderIdParam,
  body('archived').isBoolean().withMessage('archived must be a boolean'),
];

export const adminCustomOrderConfigValidator = [
  body('content').optional().isObject().withMessage('content must be an object'),
];
