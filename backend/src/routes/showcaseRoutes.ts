import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import {
  getShowcases,
  getShowcaseById,
  createShowcase,
  updateShowcase,
  deleteShowcase
} from '../controllers/showcaseController';

const router = Router();

router.get('/', getShowcases);
router.get('/:id', getShowcaseById);
router.post('/', requireAuth, requireAdmin, createShowcase);
router.put('/:id', requireAuth, requireAdmin, updateShowcase);
router.delete('/:id', requireAuth, requireAdmin, deleteShowcase);

export default router;
