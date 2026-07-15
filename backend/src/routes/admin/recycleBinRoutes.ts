import { Router } from 'express';
import {
  getRecycleBinItems,
  getRecycleBinStats,
  getScheduledPurgePreview,
  getRecycleBinAuditLogs,
  exportRecycleBinAuditLogs,
  getRecycleBinItem,
  checkRestoreConflicts,
  restoreItem,
  permanentDeleteItem,
  bulkRestore,
  bulkPermanentDelete,
  emptyRecycleBin,
} from '../../controllers/admin/recycleBinController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// All routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// List & Search
router.get('/', getRecycleBinItems);

// Stats & Analytics
router.get('/stats', getRecycleBinStats);

// Scheduled Purge Preview
router.get('/purge-preview', getScheduledPurgePreview);

// Audit Logs
router.get('/audit-logs', getRecycleBinAuditLogs);
router.get('/audit-logs/export', exportRecycleBinAuditLogs);

// Bulk Operations
router.post('/bulk-restore', bulkRestore);
router.post('/bulk-delete', bulkPermanentDelete);

// Empty Recycle Bin
router.post('/empty', emptyRecycleBin);

// Single Item Operations (must be after named routes to avoid conflicts)
router.get('/:id', getRecycleBinItem);
router.get('/:id/conflicts', checkRestoreConflicts);
router.patch('/:id/restore', restoreItem);
router.delete('/:id/permanent', permanentDeleteItem);

export default router;
