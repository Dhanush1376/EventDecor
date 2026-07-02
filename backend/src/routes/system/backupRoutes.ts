import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../../middleware/authMiddleware';
import * as backupController from '../../controllers/system/backupController';

const router = Router();

// Protect all backup routes
router.use(requireAuth, requireSuperAdmin);

// Dashboard & Overview
router.get('/dashboard', backupController.getDashboard);
router.get('/health', backupController.getDashboard); // Using dashboard for now
router.get('/dependencies/graph', backupController.getDependencyGraph);

// History & Detail
router.get('/history', backupController.getHistory);
router.get('/:id', backupController.getBackupDetail);

// Trigger Actions
router.post('/trigger', backupController.triggerBackup);

// Analytics
router.get('/storage', backupController.getStorageAnalytics);

// Restore & DR
router.post('/restore/simulate', backupController.simulateRestore);
router.post('/restore/execute', backupController.executeRestore);
router.post('/chaos/run', backupController.runChaosTest);

// Audit & Keys
router.get('/audit', backupController.getAuditTrail);
router.get('/keys/history', backupController.getKeyHistory);

export default router;
