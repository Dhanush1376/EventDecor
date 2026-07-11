import { Router } from 'express';
import {
  createCampaign,
  updateCampaign,
  getCampaigns,
  deleteCampaign,
  createRule,
  updateRule,
  getCampaignRules,
  deleteRule,
} from '../../controllers/marketing/campaignController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Base routes for marketing campaigns (Admin only)
router.use(requireAuth, requireAdmin);

// Campaign endpoints
router.post('/', createCampaign);
router.get('/', getCampaigns);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

// Rule endpoints
router.post('/rules', createRule);
router.get('/:campaignId/rules', getCampaignRules);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);

export default router;
