import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import * as returnController from '../../controllers/returns/returnController';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { createRateLimiter, accountKeyGenerator } from '../../middleware/rateLimiter';
import { orderIdParamsSchema, whatsappReturnRequestSchema } from '../../validators/returnValidator';

const router = express.Router();

const whatsappRequestLimiter = createRateLimiter('whatsappReturnRequest', {
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many return requests. Please try again in a few minutes.',
  keyGenerator: accountKeyGenerator,
});

// Returns & exchanges are requested over WhatsApp and handled manually by the store.
router.get(
  '/whatsapp/:orderId',
  requireAuth,
  validateRequest(orderIdParamsSchema),
  returnController.getWhatsAppEligibility,
);
router.post(
  '/whatsapp/:orderId',
  requireAuth,
  whatsappRequestLimiter,
  validateRequest(whatsappReturnRequestSchema),
  returnController.buildWhatsAppRequest,
);

// Read-only history of requests made through the previous automated flow.
router.get('/my-returns', requireAuth, returnController.getMyReturns);
router.get(
  '/order/:orderId/summary',
  requireAuth,
  validateRequest(orderIdParamsSchema),
  returnController.getReturnForOrder,
);

export default router;
