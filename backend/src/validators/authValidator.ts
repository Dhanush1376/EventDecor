import { body } from 'express-validator';
import { canonicalizeEmail } from '../utils/emailHelper';

const emailField = (field: string) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer((value) => canonicalizeEmail(value));

export const sendOtpValidator = [emailField('email')];

export const verifyOtpValidator = [
  emailField('email'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .customSanitizer((value) => String(value).replace(/\D/g, '').slice(0, 6))
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
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
