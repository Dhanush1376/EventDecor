import { Router } from 'express';
import { CatalogHealthController } from '../../controllers/products/catalogHealthController';
import { requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Apply admin auth to all routes
router.use(requireAdmin);

// Catalog Registry Routes
router.get('/registry', CatalogHealthController.listRegistry);
router.post('/registry', CatalogHealthController.createRegistryValue);
router.put('/registry/:id', CatalogHealthController.updateRegistryValue);
router.delete('/registry/:id', CatalogHealthController.deleteRegistryValue);

// Approvals & Merging
router.get('/registry/pending', CatalogHealthController.getPendingApprovals);
router.patch('/registry/:id/approve', CatalogHealthController.approveValue);
router.patch('/registry/:id/reject', CatalogHealthController.rejectValue);
router.post('/registry/:id/merge', CatalogHealthController.mergeValue);

// Synonyms
router.get('/synonyms', CatalogHealthController.listSynonyms);
router.post('/synonyms', CatalogHealthController.createSynonym);
router.delete('/synonyms/:id', CatalogHealthController.deleteSynonym);

// Analytics & Health
router.get('/stats', CatalogHealthController.getStats);
router.post('/health/run', CatalogHealthController.triggerHealthScan);
router.get('/health/report', CatalogHealthController.getLatestHealthReport);
router.get('/learning', CatalogHealthController.getLearningLog);
router.delete('/learning/:id', CatalogHealthController.forgetLearning);

export default router;
