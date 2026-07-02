import { body } from 'express-validator';
import { mongoIdParam } from './commonValidator';

const CUSTOM_ORDER_STATUSES = [
  'Pending',
  'Reviewing',
  'Quote Sent',
  'Approved',
  'Checkout Ready',
  'Payment Received',
  'In Progress',
  'In Production',
  'Quality Check',
  'Ready',
  'Dispatched',
  'Delivered',
  'Completed',
  'Cancelled',
] as const;

const PRIORITIES = ['low', 'medium', 'high'] as const;

export const submitCustomOrderValidator = [
  body('occasion').optional().trim().isLength({ max: 100 }),
  body('productType').optional().trim().isLength({ max: 100 }),
  body('customOrderType').optional().isIn(['product', 'event', 'general']),
  body('dynamicData').optional().isObject(),
  body('eventDetails').optional().isObject(),
  body('venueInformation').optional().isObject(),
  body('displayRequirements').optional().isObject(),
  body('generalRequirements').optional().isObject(),
  body('projectRequirements').optional().isObject(),
  body('customSpecifications').optional().isObject(),
  body('inspirationImages').optional().isArray().withMessage('Inspiration images must be an array'),
  body('inspirationImages.*')
    .optional()
    .isURL()
    .withMessage('Inspiration image must be a valid URL'),
  body('customRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Custom requirements must be at most 5000 characters'),
  body('budget').trim().notEmpty().withMessage('Budget range is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('eventDate')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Event date must be a valid ISO 8601 date'),
  body('city').trim().notEmpty().withMessage('City is required').isLength({ max: 100 }),
  body('bookingType').trim().notEmpty().withMessage('Booking consultation type is required'),
  body('customerPhone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Customer phone must be at most 20 characters'),
];

export const submitProductCustomizationValidator = [
  body('productId')
    .trim()
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('customizationData').optional().isArray().withMessage('Customization data must be an array'),
  body('customizationData.*.fieldName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Field name must be at most 200 characters'),
  body('customizationData.*.fieldType')
    .optional()
    .isIn(['text', 'textarea', 'dropdown', 'multiselect', 'color', 'number'])
    .withMessage('Invalid field type'),
  body('customRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Custom requirements must be at most 10000 characters'),
  body('files').optional().isArray().withMessage('Files must be an array'),
  body('files.*.url').optional().isURL().withMessage('File URL must be valid'),
  body('files.*.originalName').optional().trim().isLength({ max: 255 }),
  body('files.*.mimeType').optional().trim().isLength({ max: 100 }),
  body('files.*.size').optional().isInt({ min: 0 }).withMessage('File size must be non-negative'),
  body('referenceImages').optional().isArray().withMessage('Reference images must be an array'),
  body('voiceNotes').optional().isArray().withMessage('Voice notes must be an array'),
  body('videoReferences').optional().isArray().withMessage('Video references must be an array'),
  body('annotations').optional().isArray().withMessage('Annotations must be an array'),
  body('costEstimation').optional().isObject().withMessage('Cost estimation must be an object'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('customerPhone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
];

export const saveDraftValidator = [
  body('productId')
    .optional()
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('customizationData').optional().isArray().withMessage('Customization data must be an array'),
  body('customRequirements').optional({ values: 'falsy' }).trim().isLength({ max: 10000 }),
  body('files').optional().isArray(),
  body('referenceImages').optional().isArray(),
  body('costEstimation').optional().isObject(),
  body('draftId').optional().isMongoId().withMessage('Draft ID must be a valid MongoDB ObjectId'),
];

export const customOrderIdParam = mongoIdParam('id');

export const adminUpdateCustomOrderStatusValidator = [
  ...customOrderIdParam,
  body('status')
    .trim()
    .notEmpty()
    .isIn([...CUSTOM_ORDER_STATUSES]),
];

export const adminUpdatePriorityValidator = [
  ...customOrderIdParam,
  body('priority')
    .trim()
    .notEmpty()
    .isIn([...PRIORITIES]),
];

export const adminCustomOrderNotesValidator = [
  ...customOrderIdParam,
  body('adminNotes').optional({ values: 'falsy' }).trim().escape().isLength({ max: 5000 }),
];

export const adminInternalNoteValidator = [
  ...customOrderIdParam,
  body('text')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Note text is required')
    .isLength({ max: 5000 })
    .withMessage('Note must be at most 5000 characters'),
];

export const adminAssignStaffValidator = [
  ...customOrderIdParam,
  body('staffAssignments').isArray({ min: 0 }).withMessage('Staff assignments must be an array'),
  body('staffAssignments.*.userId')
    .isMongoId()
    .withMessage('Staff user ID must be a valid MongoDB ObjectId'),
  body('staffAssignments.*.role')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Staff role must be at most 50 characters'),
];

export const adminCustomOrderQuotationValidator = [
  ...customOrderIdParam,
  body('items').optional().isArray(),
  body('items.*.description').optional().trim().isLength({ max: 200 }),
  body('items.*.amount').optional().isFloat({ min: 0 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('shipping').optional().isFloat({ min: 0 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['draft', 'sent', 'approved', 'rejected']),
];

export const customerQuotationRespondValidator = [
  ...customOrderIdParam,
  body('status').trim().notEmpty().isIn(['approved', 'rejected']),
  body('reason').optional({ values: 'falsy' }).trim().escape().isLength({ max: 1000 }),
];

export const customOrderMessageValidator = [
  ...customOrderIdParam,
  body('text').trim().escape().notEmpty().isLength({ max: 5000 }),
  body('attachments').optional().isArray(),
  body('attachments.*').optional().isURL(),
];

export const adminArchiveOrderValidator = [
  ...customOrderIdParam,
  body('archived').isBoolean().withMessage('archived must be a boolean'),
];

export const adminCustomOrderConfigValidator = [
  body('content').isObject().withMessage('content must be an object'),
  body('content.occasions').optional().isArray().withMessage('occasions must be an array'),
  body('content.productTypes').optional().isArray().withMessage('productTypes must be an array'),
  body('content.themes').optional().isArray().withMessage('themes must be an array'),
  body('content.budgetRanges').optional().isArray().withMessage('budgetRanges must be an array'),
  body('content.bookingTypes').optional().isArray().withMessage('bookingTypes must be an array'),
  body('content.*.*.id').optional().isString().trim(),
  body('content.*.*.label').optional().isString().trim(),
  body('content.*.*.enabled').optional().isBoolean(),
];
