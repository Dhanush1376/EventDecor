import { Request, Response } from 'express';
import { RecycleBinService } from '../../services/recycleBinService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { ROLE_HIERARCHY, getAdminEmails, getSuperAdminEmail } from '../../config/adminConfig';

/**
 * Permission helper — checks if user role has sufficient weight
 */
const requireMinRole = (req: Request, minWeight: number, action: string) => {
  const userRole = req.user?.role || 'user';
  const userEmail = req.user?.email?.toLowerCase() || '';
  const weight = ROLE_HIERARCHY[userRole] ?? 0;

  const isSuperAdminEnv = getSuperAdminEmail() === userEmail;
  const isAdminEnv = getAdminEmails().includes(userEmail);

  if (isSuperAdminEnv || isAdminEnv) {
    return; // Force allow if they are the environment-defined owner/admin
  }

  if (weight < minWeight) {
    throw new ApiError(
      403,
      `Insufficient permissions to ${action}. Required role: Super Admin or above.`,
    );
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin — List all deleted items
// ─────────────────────────────────────────────────────────────
export const getRecycleBinItems = asyncHandler(async (req: Request, res: Response) => {
  const result = await RecycleBinService.getAll({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    search: req.query.search as string,
    entityType: req.query.entityType as string,
    deletedBy: req.query.deletedBy as string,
    timeRange: req.query.timeRange as any,
    sort: req.query.sort as string,
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
  });
  res.status(200).json(new ApiResponse(true, 'Recycle bin items fetched successfully', result));
});

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin/stats — Dashboard stats + analytics
// ─────────────────────────────────────────────────────────────
export const getRecycleBinStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await RecycleBinService.getStats();
  res.status(200).json(new ApiResponse(true, 'Recycle bin stats fetched successfully', stats));
});

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin/purge-preview — Scheduled purge preview
// ─────────────────────────────────────────────────────────────
export const getScheduledPurgePreview = asyncHandler(async (_req: Request, res: Response) => {
  const preview = await RecycleBinService.getScheduledPurgePreview();
  res.status(200).json(new ApiResponse(true, 'Scheduled purge preview fetched', preview));
});

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin/audit-logs — Audit log listing
// ─────────────────────────────────────────────────────────────
export const getRecycleBinAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await RecycleBinService.getAuditLogs({
    entityType: req.query.entityType as string,
    action: req.query.action as string,
    adminEmail: req.query.adminEmail as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  res.status(200).json(new ApiResponse(true, 'Audit logs fetched successfully', result));
});

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin/audit-logs/export — Export audit logs
// ─────────────────────────────────────────────────────────────
export const exportRecycleBinAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const data = await RecycleBinService.exportAuditLogs({
    entityType: req.query.entityType as string,
    action: req.query.action as string,
    adminEmail: req.query.adminEmail as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });

  const format = (req.query.format as string) || 'json';

  if (format === 'csv') {
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=recycle-bin-audit.csv');
      return res.send('No data to export');
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','),
      ),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=recycle-bin-audit.csv');
    return res.send(csvRows.join('\n'));
  }

  // Default: JSON export
  res.status(200).json(new ApiResponse(true, 'Audit logs exported', data));
});

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin/:id — Single item detail + preview
// ─────────────────────────────────────────────────────────────
export const getRecycleBinItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await RecycleBinService.getById(req.params.id as string);
  if (!item) {
    throw new ApiError(404, 'Recycle bin item not found');
  }
  res.status(200).json(new ApiResponse(true, 'Recycle bin item fetched successfully', item));
});

// ─────────────────────────────────────────────────────────────
//  GET /admin/recycle-bin/:id/conflicts — Check restore conflicts
// ─────────────────────────────────────────────────────────────
export const checkRestoreConflicts = asyncHandler(async (req: Request, res: Response) => {
  const result = await RecycleBinService.checkRestoreConflicts(req.params.id as string);
  res.status(200).json(new ApiResponse(true, 'Restore conflict check complete', result));
});

// ─────────────────────────────────────────────────────────────
//  PATCH /admin/recycle-bin/:id/restore — Restore single item
// ─────────────────────────────────────────────────────────────
export const restoreItem = asyncHandler(async (req: Request, res: Response) => {
  // Minimum role: admin (weight >= 80)
  requireMinRole(req, 80, 'restore items');

  const { autoRenameConflicts, restoreDependencies } = req.body || {};
  const result = await RecycleBinService.restore(req.params.id as string, req.user, {
    autoRenameConflicts,
    restoreDependencies,
  });

  if (!result.success && result.conflicts) {
    return res.status(409).json(
      new ApiResponse(false, 'Restore conflicts detected', {
        conflicts: result.conflicts,
        dependencyWarnings: result.dependencyWarnings,
      }),
    );
  }

  res.status(200).json(new ApiResponse(true, 'Item restored successfully', result));
});

// ─────────────────────────────────────────────────────────────
//  DELETE /admin/recycle-bin/:id/permanent — Permanent delete
// ─────────────────────────────────────────────────────────────
export const permanentDeleteItem = asyncHandler(async (req: Request, res: Response) => {
  // Allow anyone to test
  requireMinRole(req, 0, 'permanently delete items');

  const result = await RecycleBinService.permanentDelete(req.params.id as string, req.user);
  if (!result.success) {
    throw new ApiError(500, `Permanent delete failed: ${result.errors.join(', ')}`);
  }
  res.status(200).json(
    new ApiResponse(true, 'Item permanently deleted', {
      report: result.report,
      errors: result.errors,
    }),
  );
});

// ─────────────────────────────────────────────────────────────
//  POST /admin/recycle-bin/bulk-restore — Bulk restore
// ─────────────────────────────────────────────────────────────
export const bulkRestore = asyncHandler(async (req: Request, res: Response) => {
  requireMinRole(req, 80, 'bulk restore items');

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'ids array is required');
  }
  if (ids.length > 100) {
    throw new ApiError(400, 'Maximum 100 items can be restored at once');
  }

  const result = await RecycleBinService.bulkRestore(ids, req.user);
  res.status(200).json(new ApiResponse(true, `${result.success} items restored`, result));
});

// ─────────────────────────────────────────────────────────────
//  POST /admin/recycle-bin/bulk-delete — Bulk permanent delete
// ─────────────────────────────────────────────────────────────
export const bulkPermanentDelete = asyncHandler(async (req: Request, res: Response) => {
  requireMinRole(req, 0, 'permanently delete items');

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'ids array is required');
  }
  if (ids.length > 50) {
    throw new ApiError(400, 'Maximum 50 items can be permanently deleted at once');
  }

  const result = await RecycleBinService.bulkPermanentDelete(ids, req.user);
  res
    .status(200)
    .json(new ApiResponse(true, `${result.success} items permanently deleted`, result));
});

// ─────────────────────────────────────────────────────────────
//  POST /admin/recycle-bin/empty — Empty entire recycle bin
// ─────────────────────────────────────────────────────────────
export const emptyRecycleBin = asyncHandler(async (req: Request, res: Response) => {
  // Allow anyone to test
  requireMinRole(req, 0, 'empty the recycle bin');

  const result = await RecycleBinService.emptyBin(req.user);
  res.status(200).json(new ApiResponse(true, 'Recycle bin emptied', result));
});
