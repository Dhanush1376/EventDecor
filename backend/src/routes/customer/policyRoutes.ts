import { Router } from 'express';
import {
  getAllPolicies,
  getPolicyBySlug,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from '../../controllers/customer/policyController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/slug/:slug', getPolicyBySlug);

// Protected Admin Routes
router.use(requireAuth, requireAdmin);
router.get('/', getAllPolicies);
router.get('/:id', getPolicyById);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

export default router;
