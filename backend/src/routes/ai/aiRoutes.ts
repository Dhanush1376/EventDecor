import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import {
  getSettings,
  updateSettings,
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  validateProvider,
  detectProviderModels,
  getUsageLogs,
  getUsageSummary,
} from '../../controllers/ai/aiConfigController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);
router.use(requireAdmin);

// Global Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Providers
router.get('/providers', getProviders);
router.post('/providers', createProvider);
router.put('/providers/:id', updateProvider);
router.delete('/providers/:id', deleteProvider);

// Operations
router.post('/providers/:id/validate', validateProvider);
router.post('/providers/:id/detect-models', detectProviderModels);

// Analytics & Health
router.get('/usage', getUsageLogs);
router.get('/usage/summary', getUsageSummary);

export default router;
