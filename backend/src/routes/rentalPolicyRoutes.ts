import { Router } from 'express';
import { getRentalPolicy, updateRentalPolicy } from '../controllers/rentalPolicyController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { rentalPolicyValidator } from '../validators/rentalValidator';

const router = Router();

// Public — customers need to see the policy during checkout
router.get('/', getRentalPolicy);

// Admin only — update policy
router.put('/', requireAuth, requireAdmin, rentalPolicyValidator, validate, updateRentalPolicy);

export default router;
