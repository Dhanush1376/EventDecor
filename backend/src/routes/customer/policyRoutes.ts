import { Router } from 'express';
import {
  getAllPolicies,
  getPolicyBySlug,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyVersions,
  restorePolicyVersion,
  generatePolicyAi,
  getPublicPolicies,
} from '../../controllers/customer/policyController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/public/list', getPublicPolicies);
router.get('/slug/:slug', getPolicyBySlug);

// Protected Admin Routes
router.use(requireAuth, requireAdmin);
router.get('/', getAllPolicies);
router.get('/:id', getPolicyById);
router.post('/generate', generatePolicyAi);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);
router.get('/:id/versions', getPolicyVersions);
router.post('/:id/versions/:version/restore', restorePolicyVersion);

export default router;
