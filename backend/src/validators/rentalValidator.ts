import { body } from 'express-validator';

export const createRentalOrderValidator = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('rentalStartDate')
    .notEmpty()
    .withMessage('Rental start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('rentalEndDate')
    .notEmpty()
    .withMessage('Rental end date is required')
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  body('shippingAddress.name').notEmpty().withMessage('Name is required').trim(),
  body('shippingAddress.phone').notEmpty().withMessage('Phone is required').trim(),
  body('shippingAddress.email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email'),
  body('shippingAddress.pincode').notEmpty().withMessage('Pincode is required').trim(),
  body('shippingAddress.locality').notEmpty().withMessage('Locality is required').trim(),
  body('shippingAddress.address').notEmpty().withMessage('Address is required').trim(),
  body('shippingAddress.city').notEmpty().withMessage('City is required').trim(),
  body('shippingAddress.state').notEmpty().withMessage('State is required').trim(),
  body('identityDocuments').optional().isArray().withMessage('Identity documents must be an array'),
  body('identityDocuments.*.type')
    .optional()
    .isIn(['aadhaar', 'pan', 'driving_license', 'voter_id']),
  body('identityDocuments.*.url').optional().isURL().withMessage('Document URL must be valid'),
  body('aadhaarNumber')
    .notEmpty()
    .withMessage('Aadhaar number is required')
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar number must be exactly 12 digits'),
  body('agreementAccepted')
    .isBoolean()
    .withMessage('Agreement acceptance is required')
    .custom((value) => {
      if (!value) throw new Error('You must accept the rental agreement');
      return true;
    }),
];

export const rentalPaymentValidator = [
  body('razorpayOrderId').notEmpty().withMessage('Razorpay order ID is required'),
  body('razorpayPaymentId').notEmpty().withMessage('Razorpay payment ID is required'),
  body('razorpaySignature').notEmpty().withMessage('Razorpay signature is required'),
];

export const calculateRentalCostValidator = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

export const checkAvailabilityValidator = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date'),
];

export const checkServiceAreaValidator = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

export const inspectionValidator = [
  body('condition')
    .notEmpty()
    .withMessage('Condition is required')
    .isIn(['excellent', 'good', 'minor_damage', 'major_damage', 'lost'])
    .withMessage('Invalid condition'),
  body('notes').optional().trim(),
  body('images').optional().isArray().withMessage('Images must be an array'),
];

export const releaseDepositValidator = [
  body('deductionAmount').isFloat({ min: 0 }).withMessage('Deduction amount must be 0 or greater'),
  body('deductionReason').optional().trim(),
  body('method').isIn(['razorpay', 'cash']).withMessage('Method must be razorpay or cash'),
];

export const updateRentalStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      'pending',
      'confirmed',
      'packed',
      'out_for_delivery',
      'delivered',
      'active_rental',
      'return_requested',
      'returned',
      'completed',
      'late_return',
      'damaged',
      'lost',
      'cancelled',
      'refunded',
    ])
    .withMessage('Invalid status'),
  body('note').optional().trim(),
];

export const serviceAreaValidator = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('center.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('center.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('radiusKm').isFloat({ min: 1, max: 500 }).withMessage('Radius must be between 1 and 500 km'),
  body('address').notEmpty().withMessage('Address is required').trim(),
];

export const rentalPolicyValidator = [
  body('lateReturnFeePerDay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Late fee must be 0 or greater'),
  body('damagePolicy.minor').optional().isFloat({ min: 0 }),
  body('damagePolicy.major').optional().isFloat({ min: 0 }),
  body('damagePolicy.complete').optional().isFloat({ min: 0 }),
  body('lostProductPolicy.type').optional().isIn(['full_cost', 'percentage']),
  body('lostProductPolicy.percentage').optional().isFloat({ min: 0, max: 200 }),
  body('cancellationPolicy.freeCancelHours').optional().isInt({ min: 0 }),
  body('cancellationPolicy.postConfirmChargePercent').optional().isFloat({ min: 0, max: 100 }),
  body('returnConditions').optional().isArray(),
  body('requiredDocuments').optional().isArray(),
  body('requiredDocuments.*').optional().isIn(['aadhaar', 'pan', 'driving_license', 'voter_id']),
  body('identityVerificationRequired').optional().isBoolean(),
  body('termsAndConditions').optional().trim(),
];
