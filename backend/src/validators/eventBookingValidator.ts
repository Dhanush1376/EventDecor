import { body } from 'express-validator';

export const submitEventBookingValidator = [
  body('eventPackageId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Invalid event package ID format'),
  body('title')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be at most 200 characters'),
  body('eventType')
    .trim()
    .notEmpty()
    .withMessage('Event type is required')
    .isLength({ max: 100 }),
  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Event date must be a valid ISO 8601 date'),
  body('guestCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Guest count must be at least 1'),
  body('venue.address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Venue address must be at most 500 characters'),
  body('venue.name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Venue name must be at most 200 characters'),
  body('venue.city')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }),
  body('venue.state')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }),
  body('venue.country')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }),
  body('venue.pincode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 }),
  body('venue.latitude')
    .optional({ values: 'falsy' })
    .isNumeric()
    .withMessage('Latitude must be a number'),
  body('venue.longitude')
    .optional({ values: 'falsy' })
    .isNumeric()
    .withMessage('Longitude must be a number'),
  body('venue.googleMapsLink')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }),
  body('venue.isOutdoor')
    .optional()
    .isBoolean()
    .withMessage('isOutdoor must be a boolean value'),
  body('selectedAddons')
    .optional()
    .isArray()
    .withMessage('Selected addons must be an array'),
  body('selectedAddons.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Addon name cannot be empty'),
  body('selectedAddons.*.price')
    .optional()
    .isNumeric()
    .withMessage('Addon price must be a number'),
  body('inspirationImages')
    .optional()
    .isArray()
    .withMessage('Inspiration images must be an array'),
  body('inspirationImages.*')
    .optional()
    .isURL()
    .withMessage('Inspiration image must be a valid URL'),
];
