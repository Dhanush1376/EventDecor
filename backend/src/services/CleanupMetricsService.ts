import CleanupAuditLog from '../models/CleanupAuditLog';
import Media from '../models/Media';
import { Queue } from 'bullmq';
import { cleanupQueue } from '../jobs/queues';

export interface CleanupMetrics {
  assetsDeletedTotal: number;
  assetsDeletedToday: number;
  orphanedAssetsFound: number;
  cleanupFailures: number;
  retryCount: number;
  deadLetterCount: number;
  pendingCleanupCount: number;
  bytesReclaimedTotal: number;
  bytesReclaimedThisMonth: number;
  storageSavedByDedup: number;
  averageCleanupDurationMs: number;
  queueSize: number;
  pendingDeleteStuckCount: number;
  byEntityType: { entityType: string; deletedCount: number; failedCount: number }[];
  byProvider: { provider: string; deletedCount: number; bytesReclaimed: number }[];
  lastIntegrityCheckAt: Date | null;
  lastOrphanScanAt: Date | null;
}

export class CleanupMetricsService {
  static async getMetrics(_periodDays: number = 7): Promise<CleanupMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const stuckThreshold = new Date();
    stuckThreshold.setDate(stuckThreshold.getDate() - 3); // 3 days in pending_delete

    const [
      totalMetrics,
      todayMetrics,
      monthMetrics,
      entityMetrics,
      providerMetrics,
      queueStatus,
      orphanMetrics,
      pendingStuckCount,
    ] = await Promise.all([
      CleanupAuditLog.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalDeleted: { $sum: '$assetsDeleted' },
            totalBytes: { $sum: '$bytesReclaimed' },
            avgDuration: { $avg: '$executionMs' },
            totalFailures: { $sum: '$assetsFailed' },
          },
        },
      ]),
      CleanupAuditLog.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: today } } },
        { $group: { _id: null, deletedToday: { $sum: '$assetsDeleted' } } },
      ]),
      CleanupAuditLog.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: monthAgo } } },
        { $group: { _id: null, bytesMonth: { $sum: '$bytesReclaimed' } } },
      ]),
      CleanupAuditLog.aggregate([
        {
          $group: {
            _id: '$entityType',
            deletedCount: { $sum: '$assetsDeleted' },
            failedCount: { $sum: '$assetsFailed' },
          },
        },
      ]),
      CleanupAuditLog.aggregate([
        { $unwind: '$deletedAssets' },
        {
          $group: {
            _id: '$deletedAssets.provider',
            deletedCount: { $sum: 1 },
            bytesReclaimed: { $sum: '$deletedAssets.bytesReclaimed' },
          },
        },
      ]),
      this.getQueueStatus(cleanupQueue),
      CleanupAuditLog.aggregate([
        { $match: { operation: 'dead_data_scan' } },
        { $group: { _id: null, totalOrphans: { $sum: '$assetsDeleted' } } },
      ]),
      Media.countDocuments({ status: 'pending_delete', updatedAt: { $lt: stuckThreshold } }),
    ]);

    // Additional dummy data for fields not yet fully tracked
    return {
      assetsDeletedTotal: totalMetrics[0]?.totalDeleted || 0,
      assetsDeletedToday: todayMetrics[0]?.deletedToday || 0,
      orphanedAssetsFound: orphanMetrics[0]?.totalOrphans || 0,
      cleanupFailures: totalMetrics[0]?.totalFailures || 0,
      retryCount: 0,
      deadLetterCount: queueStatus.failed,
      pendingCleanupCount: queueStatus.waiting,
      bytesReclaimedTotal: totalMetrics[0]?.totalBytes || 0,
      bytesReclaimedThisMonth: monthMetrics[0]?.bytesMonth || 0,
      storageSavedByDedup: 0,
      averageCleanupDurationMs: Math.round(totalMetrics[0]?.avgDuration || 0),
      queueSize: queueStatus.waiting,
      pendingDeleteStuckCount: pendingStuckCount,
      byEntityType: entityMetrics.map((e: any) => ({
        entityType: e._id,
        deletedCount: e.deletedCount,
        failedCount: e.failedCount,
      })),
      byProvider: providerMetrics.map((p: any) => ({
        provider: p._id,
        deletedCount: p.deletedCount,
        bytesReclaimed: p.bytesReclaimed,
      })),
      lastIntegrityCheckAt: null,
      lastOrphanScanAt: null,
    };
  }

  private static async getQueueStatus(queue: Queue) {
    if (!queue) return { waiting: 0, failed: 0 };
    try {
      const [waiting, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getFailedCount(),
      ]);
      return { waiting, failed };
    } catch {
      return { waiting: 0, failed: 0 };
    }
  }
}
