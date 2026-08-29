import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  submitEventJob,
  getMyEventJobs,
  getSingleEventJob,
  customerApproveQuote,
  customerSubmitPayment,
  postChatMessage,
  adminGetAllBookings,
  adminUpdateStatus,
  adminUpdateQuotation,
  adminUpdateLogistics,
  adminUpdateNotes,
  initializeBookingCheckout,
  verifyBookingCheckout,
  initializeMilestonePayment,
  adminRecordPayment,
  adminDeletePayment,
} from '../../controllers/events/eventBookingController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import {
  getServiceableLocations,
  getLocationDetails,
  estimateTravelExpense,
} from '../../controllers/events/serviceabilityController';
import { validate } from '../../middleware/validateMiddleware';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { initializeCheckoutSchema } from '../../validators/eventBookingSchemas';
import {
  submitEventJobValidator,
  eventBookingIdParam,
  adminUpdateBookingStatusValidator,
  adminUpdateQuotationValidator,
  customerApproveQuoteValidator,
  customerBookingPaymentValidator,
  bookingChatValidator,
  adminBookingNotesValidator,
} from '../../validators/eventBookingValidator';

const router = Router();

const bookingSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 bookings per hour per IP
  keyGenerator: (req: any) => req.user?.id || 'anonymous', // Always authenticated via requireAuth
  message: { message: 'Too many booking submissions. Please try again later.' },
});

// Admin / Operations Management Endpoints
router.get('/admin/all', requireAuth, requireAdmin, adminGetAllBookings);
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  ...adminUpdateBookingStatusValidator,
  validate,
  adminUpdateStatus,
);
router.patch(
  '/:id/quotation',
  requireAuth,
  requireAdmin,
  ...adminUpdateQuotationValidator,
  validate,
  adminUpdateQuotation,
);
router.patch(
  '/:id/logistics',
  requireAuth,
  requireAdmin,
  ...eventBookingIdParam,
  validate,
  adminUpdateLogistics,
);
router.patch(
  '/:id/notes',
  requireAuth,
  requireAdmin,
  ...adminBookingNotesValidator,
  validate,
  adminUpdateNotes,
);
router.patch(
  '/:id/admin-payment',
  requireAuth,
  requireAdmin,
  ...eventBookingIdParam,
  validate,
  adminRecordPayment,
);
router.delete(
  '/:id/admin-payment/:transactionId',
  requireAuth,
  requireAdmin,
  ...eventBookingIdParam, // valid ID param
  validate,
  adminDeletePayment,
);

// Client Endpoints

// Public Serviceability API
router.get('/serviceability/locations', getServiceableLocations);
router.get('/serviceability/:locationCode', getLocationDetails);
router.post('/travel-expense/estimate', estimateTravelExpense);

router.post(
  '/checkout/initialize',
  requireAuth,
  bookingSubmitLimiter,
  validateRequest(initializeCheckoutSchema),
  initializeBookingCheckout,
);
router.post('/checkout/verify', requireAuth, verifyBookingCheckout);
router.post(
  '/:id/payment/initialize',
  requireAuth,
  ...eventBookingIdParam,
  validate,
  initializeMilestonePayment,
);
router.post(
  '/',
  requireAuth,
  bookingSubmitLimiter,
  submitEventJobValidator,
  validate,
  submitEventJob,
);
router.get('/my-bookings', requireAuth, getMyEventJobs);
router.get('/:id', requireAuth, ...eventBookingIdParam, validate, getSingleEventJob);
router.post(
  '/:id/respond-quote',
  requireAuth,
  ...customerApproveQuoteValidator,
  validate,
  customerApproveQuote,
);
router.post(
  '/:id/payment',
  requireAuth,
  ...customerBookingPaymentValidator,
  validate,
  customerSubmitPayment,
);
router.post('/:id/chat', requireAuth, ...bookingChatValidator, validate, postChatMessage);

export default router;
