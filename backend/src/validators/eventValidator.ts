import { body } from 'express-validator';
import { mongoIdParam } from './commonValidator';

export const eventIdParam = mongoIdParam('id');

export const createEventValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('subtitle').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('style').trim().notEmpty().withMessage('Style is required'),
  body('image').trim().notEmpty().withMessage('Image is required').isURL(),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 10000 }),
  body('colorPalette').optional().isArray(),
  body('features').optional().isArray(),
  body('gallery').optional().isArray(),
  body('gallery.*').optional().isURL(),
  body('isActive').optional().isBoolean(),
];

export const updateEventValidator = [
  ...eventIdParam,
  body('title').optional({ values: 'falsy' }).trim().notEmpty().isLength({ max: 200 }),
  body('category').optional({ values: 'falsy' }).trim().notEmpty(),
  body('style').optional({ values: 'falsy' }).trim().notEmpty(),
  body('image').optional({ values: 'falsy' }).isURL(),
  body('description').optional({ values: 'falsy' }).trim().notEmpty(),
  body('isActive').optional().isBoolean(),
];
