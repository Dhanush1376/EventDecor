import express from 'express';
import { requireAuth, authorize } from '../../middleware/authMiddleware';
import * as exchangeController from '../../controllers/returns/exchangeController';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { createExchangeSchema } from '../../validators/returnValidator';

const router = express.Router();

router.post(
  '/',
  requireAuth,
  validateRequest(createExchangeSchema),
  exchangeController.createExchange,
);

router.post('/verify-payment', requireAuth, exchangeController.verifyPayment);

router.get('/my-exchanges', requireAuth, exchangeController.getMyExchanges);

router.get(
  '/admin/all',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor', 'analyst'),
  exchangeController.getAllExchanges,
);

export default router;
