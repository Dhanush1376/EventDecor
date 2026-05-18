import { Router } from 'express';
import { submitInquiry, getInquiries, updateInquiryStatus } from '../controllers/inquiryController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { submitInquiryValidator } from '../validators/inquiryValidator';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

// Public route for submitting inquiries
router.post('/', ...submitInquiryValidator, validate, submitInquiry);

// Admin routes for viewing and updating inquiries
router.get('/', requireAuth, requireAdmin, getInquiries);
router.patch('/:id/status', requireAuth, requireAdmin, updateInquiryStatus);

export default router;
