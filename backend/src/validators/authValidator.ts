import { body } from 'express-validator';

export const sendOtpValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];


export const verifyOtpValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be exactly 6 digits')
    .isNumeric().withMessage('Verification code must contain only numbers')
];

export const refreshSessionValidator = [
  body('refreshToken')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ min: 32, max: 256 })
    .withMessage('Refresh token must be a valid string'),
];

export const logoutValidator = [
  body('refreshToken')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ min: 32, max: 256 })
    .withMessage('Refresh token must be a valid string'),
];
