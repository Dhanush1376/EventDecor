import { body } from 'express-validator';

export const createOrderValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress.name')
    .notEmpty()
    .withMessage('Name is required'),
  body('shippingAddress.phone')
    .notEmpty()
    .withMessage('Mobile number is required'),
  body('shippingAddress.email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('shippingAddress.pincode')
    .isLength({ min: 6, max: 6 })
    .withMessage('Pincode must be 6 digits'),
  body('shippingAddress.address')
    .notEmpty()
    .withMessage('Address is required'),
  body('shippingAddress.landmark')
    .optional({ checkFalsy: true }),
  body('shippingAddress.city')
    .notEmpty()
    .withMessage('City is required'),
  body('shippingAddress.state')
    .notEmpty()
    .withMessage('State is required'),
  body('shippingAddress.country')
    .notEmpty()
    .withMessage('Country is required'),
];

export const verifyPaymentValidator = [
  body('razorpay_order_id').optional().isString().trim().isLength({ max: 200 }),
  body('razorpayOrderId').optional().isString().trim().isLength({ max: 200 }),
  body('razorpay_payment_id').optional().isString().trim().isLength({ max: 200 }),
  body('razorpayPaymentId').optional().isString().trim().isLength({ max: 200 }),
  body('razorpay_signature').optional().isString().trim().isLength({ max: 500 }),
  body('razorpaySignature').optional().isString().trim().isLength({ max: 500 }),
  body().custom((_, { req }) => {
    const b = req.body;
    const hasOrder = b.razorpay_order_id || b.razorpayOrderId;
    const hasPayment = b.razorpay_payment_id || b.razorpayPaymentId;
    if (!hasOrder || !hasPayment) {
      throw new Error('razorpay order id and payment id are required');
    }
    return true;
  }),
];

export const validateTotalsValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  body('couponCode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 }),
];

export const codOtpEmailValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
];

export const codOtpVerifyValidator = [
  ...codOtpEmailValidator,
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
];

export const orderNotesValidator = [
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 3000 })
    .withMessage('Notes must be at most 3000 characters'),
];

export const updateStatusValidator = [
  body('status')
    .isIn([
      'Pending',
      'Confirmed',
      'Packed',
      'Ready to Ship',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Returned',
      'Refunded',
      'Settled',
      'placed',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'settled'
    ])
    .withMessage('Invalid order status'),
];
