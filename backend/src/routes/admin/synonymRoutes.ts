import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import {
  getSynonyms,
  createSynonym,
  updateSynonym,
  deleteSynonym,
  getPins,
  createPin,
  updatePin,
  deletePin,
  triggerReindex,
} from '../../controllers/admin/synonymController';

const router = Router();

// Require auth and admin privileges for all routes
router.use(requireAuth, requireAdmin);

// Synonyms
router.get('/synonyms', getSynonyms);
router.post('/synonyms', createSynonym);
router.put('/synonyms/:id', updateSynonym);
router.delete('/synonyms/:id', deleteSynonym);

// Pins & Boosts
router.get('/pins', getPins);
router.post('/pins', createPin);
router.put('/pins/:id', updatePin);
router.delete('/pins/:id', deletePin);

// Reindex
router.post('/reindex', triggerReindex);

export default router;
