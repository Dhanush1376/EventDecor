import { param, body } from 'express-validator';

export const mongoIdParam = (name = 'id') => [
  param(name).isMongoId().withMessage(`Invalid ${name}`),
];

export const optionalNoteValidator = [
  body('note')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Note must be at most 2000 characters'),
];
