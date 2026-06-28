import { Router } from 'express';
import {
  calculateRentalCost,
  checkAvailability,
  checkServiceArea,
  createRentalOrder,
  verifyRentalPayment,
  getMyRentals,
  getRentalDetail,
  requestReturn,
  cancelRental,
  getAllRentals,
  getAdminRentalDetail,
  updateRentalStatus,
  processInspection,
  releaseDeposit,
  getProductCalendar,
  getRentalAnalytics,
  adminCancelRental,
} from '../../controllers/rentals/rentalController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validateMiddleware';
import {
  createRentalOrderValidator,
  rentalPaymentValidator,
  calculateRentalCostValidator,
  checkAvailabilityValidator,
  checkServiceAreaValidator,
  inspectionValidator,
  releaseDepositValidator,
  updateRentalStatusValidator,
} from '../../validators/rentalValidator';

const router = Router();

// ─── Public/Customer Endpoints ───
router.post('/calculate', calculateRentalCostValidator, validate, calculateRentalCost);
router.post('/check-availability', checkAvailabilityValidator, validate, checkAvailability);
router.post('/check-service-area', checkServiceAreaValidator, validate, checkServiceArea);

// ─── Customer (Authenticated) ───
router.post('/', requireAuth, createRentalOrderValidator, validate, createRentalOrder);
router.post('/verify-payment', requireAuth, rentalPaymentValidator, validate, verifyRentalPayment);
router.get('/my-rentals', requireAuth, getMyRentals);
router.get('/detail/:id', requireAuth, getRentalDetail);
router.post('/:id/request-return', requireAuth, requestReturn);
router.post('/:id/cancel', requireAuth, cancelRental);

// ─── Admin ───
router.get('/admin/all', requireAuth, requireAdmin, getAllRentals);
router.get('/admin/detail/:id', requireAuth, requireAdmin, getAdminRentalDetail);
router.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  updateRentalStatusValidator,
  validate,
  updateRentalStatus,
);
router.post(
  '/admin/:id/inspect',
  requireAuth,
  requireAdmin,
  inspectionValidator,
  validate,
  processInspection,
);
router.post(
  '/admin/:id/release-deposit',
  requireAuth,
  requireAdmin,
  releaseDepositValidator,
  validate,
  releaseDeposit,
);
router.get('/admin/calendar', requireAuth, requireAdmin, getProductCalendar);
router.get('/admin/calendar/:productId', requireAuth, requireAdmin, getProductCalendar);
router.get('/admin/analytics', requireAuth, requireAdmin, getRentalAnalytics);
router.post('/admin/:id/cancel', requireAuth, requireAdmin, adminCancelRental);

export default router;
