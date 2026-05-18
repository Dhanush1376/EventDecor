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
    .notEmpty()
    .withMessage('Landmark is required'),
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
