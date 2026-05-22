import { body } from 'express-validator';
import { mongoIdParam } from './commonValidator';

export const galleryIdParam = mongoIdParam('id');

export const createGalleryValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('teluguTitle').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('event').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('style').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('image').trim().notEmpty().withMessage('Image URL is required').isURL(),
  body('video').optional({ values: 'falsy' }).isURL().withMessage('Video must be a valid URL'),
  body('type').optional().isIn(['inspiration', 'real-event']).withMessage('Invalid gallery type'),
  body('height').optional().trim().isLength({ max: 50 }),
  body('colorPalette').optional().isArray(),
  body('tags').optional().isArray(),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('story').optional({ values: 'falsy' }).trim().isLength({ max: 10000 }),
  body('linkedProducts').optional().isArray(),
  body('linkedProducts.*').optional().isMongoId(),
  body('isActive').optional().isBoolean(),
];

export const updateGalleryValidator = [
  ...galleryIdParam,
  body('title').optional({ values: 'falsy' }).trim().notEmpty().isLength({ max: 200 }),
  body('category').optional({ values: 'falsy' }).trim().notEmpty(),
  body('image').optional({ values: 'falsy' }).isURL(),
  body('video').optional({ values: 'falsy' }).isURL(),
  body('type').optional().isIn(['inspiration', 'real-event']),
  body('isActive').optional().isBoolean(),
];
