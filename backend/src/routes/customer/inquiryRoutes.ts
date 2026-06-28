import { Router } from 'express';
import {
  submitInquiry,
  getInquiries,
  updateInquiryStatus,
} from '../../controllers/customer/inquiryController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { submitInquirySchema, updateInquiryStatusSchema } from '../../validators/inquirySchema';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { contactLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public route for submitting inquiries
router.post('/', contactLimiter, validateRequest(submitInquirySchema), submitInquiry);

// Admin routes for viewing and updating inquiries
router.get('/', requireAuth, requireAdmin, getInquiries);
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  validateRequest(updateInquiryStatusSchema),
  updateInquiryStatus,
);

export default router;
