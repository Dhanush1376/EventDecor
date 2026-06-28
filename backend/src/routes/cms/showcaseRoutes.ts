import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import {
  getShowcases,
  getShowcaseById,
  createShowcase,
  updateShowcase,
  deleteShowcase,
} from '../../controllers/cms/showcaseController';

import { dynamicResponseCache } from '../../middleware/dynamicCacheMiddleware';
import { cacheResponse } from '../../middleware/cacheMiddleware';

const router = Router();

router.get('/', dynamicResponseCache(300, 'public'), cacheResponse(300), getShowcases);
router.get('/:id', cacheResponse(60), getShowcaseById);
router.post('/', requireAuth, requireAdmin, createShowcase);
router.put('/:id', requireAuth, requireAdmin, updateShowcase);
router.delete('/:id', requireAuth, requireAdmin, deleteShowcase);

export default router;
