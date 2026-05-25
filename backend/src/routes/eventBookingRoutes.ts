import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  submitEventBooking,
  getMyEventBookings,
  getSingleEventBooking,
  customerApproveQuote,
  customerSubmitPayment,
  postChatMessage,
  adminGetAllBookings,
  adminUpdateStatus,
  adminUpdateQuotation,
  adminUpdateLogistics,
  adminUpdateNotes,
  initializeBookingCheckout,
  verifyBookingCheckout
} from '../controllers/eventBookingController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';
import {
  submitEventBookingValidator,
  eventBookingIdParam,
  adminUpdateBookingStatusValidator,
  adminUpdateQuotationValidator,
  customerApproveQuoteValidator,
  customerBookingPaymentValidator,
  bookingChatValidator,
  adminBookingNotesValidator,
} from '../validators/eventBookingValidator';

const router = Router();

const bookingSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 bookings per hour per IP
  keyGenerator: (req: any) => req.user?.id || 'anonymous', // Always authenticated via requireAuth
  message: { message: 'Too many booking submissions. Please try again later.' },
});

// Admin / Operations Management Endpoints
router.get('/admin/all', requireAuth, requireAdmin, adminGetAllBookings);
router.patch('/:id/status', requireAuth, requireAdmin, ...adminUpdateBookingStatusValidator, validate, adminUpdateStatus);
router.patch('/:id/quotation', requireAuth, requireAdmin, ...adminUpdateQuotationValidator, validate, adminUpdateQuotation);
router.patch('/:id/logistics', requireAuth, requireAdmin, ...eventBookingIdParam, validate, adminUpdateLogistics);
router.patch('/:id/notes', requireAuth, requireAdmin, ...adminBookingNotesValidator, validate, adminUpdateNotes);

// Client Endpoints
router.post('/checkout/initialize', requireAuth, bookingSubmitLimiter, initializeBookingCheckout);
router.post('/checkout/verify', requireAuth, verifyBookingCheckout);
router.post('/', requireAuth, bookingSubmitLimiter, submitEventBookingValidator, validate, submitEventBooking);
router.get('/my-bookings', requireAuth, getMyEventBookings);
router.get('/:id', requireAuth, ...eventBookingIdParam, validate, getSingleEventBooking);
router.post('/:id/respond-quote', requireAuth, ...customerApproveQuoteValidator, validate, customerApproveQuote);
router.post('/:id/payment', requireAuth, ...customerBookingPaymentValidator, validate, customerSubmitPayment);
router.post('/:id/chat', requireAuth, ...bookingChatValidator, validate, postChatMessage);

export default router;
