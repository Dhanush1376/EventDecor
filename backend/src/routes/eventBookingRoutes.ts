import { Router } from 'express';
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
  adminUpdateNotes
} from '../controllers/eventBookingController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { submitEventBookingValidator } from '../validators/eventBookingValidator';

const router = Router();

// Admin / Operations Management Endpoints
router.get('/admin/all', requireAuth, requireAdmin, adminGetAllBookings);
router.patch('/:id/status', requireAuth, requireAdmin, adminUpdateStatus);
router.patch('/:id/quotation', requireAuth, requireAdmin, adminUpdateQuotation);
router.patch('/:id/logistics', requireAuth, requireAdmin, adminUpdateLogistics);
router.patch('/:id/notes', requireAuth, requireAdmin, adminUpdateNotes);

// Client Endpoints
router.post('/', requireAuth, submitEventBookingValidator, validate, submitEventBooking);
router.get('/my-bookings', requireAuth, getMyEventBookings);
router.get('/:id', requireAuth, getSingleEventBooking);
router.post('/:id/respond-quote', requireAuth, customerApproveQuote);
router.post('/:id/payment', requireAuth, customerSubmitPayment);
router.post('/:id/chat', requireAuth, postChatMessage);

export default router;
