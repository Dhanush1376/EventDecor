import logger from '../config/logger';
import Media from '../models/Media';
import { cleanupQueue } from './queues';
import { LifecycleConfig } from '../config/lifecycleConfig';
import { DistributedLock } from '../utils/DistributedLock';

export const sweepPendingDeletes = async () => {
  if (!LifecycleConfig.enabled || !LifecycleConfig.enableBackgroundJobs) {
    logger.info('[Sweeper] Background jobs disabled. Skipping pending delete sweep.');
    return;
  }

  const lockKey = 'job:pending_delete_sweeper';
  await DistributedLock.withLock(
    lockKey,
    async () => {
      logger.info('[Sweeper] Starting pending delete sweep...');
      const gracePeriodMs = LifecycleConfig.pendingDeleteGracePeriodMs;
      const thresholdDate = new Date(Date.now() - gracePeriodMs);

      try {
        // Find media documents in pending_delete state older than the grace period
        const pendingItems = await Media.find({
          status: 'pending_delete',
          updatedAt: { $lte: thresholdDate },
        })
          .select('_id secureUrl publicId')
          .limit(LifecycleConfig.orphanScanBatchSize);

        if (pendingItems.length === 0) {
          logger.info('[Sweeper] No pending delete items found.');
          return;
        }

        logger.info(`[Sweeper] Found ${pendingItems.length} items to purge.`);

        for (const item of pendingItems) {
          // Enqueue for deletion via the GlobalAssetCleanupService (purge operation)
          cleanupQueue.add('clean-all-assets', {
            data: [item.secureUrl],
            context: {
              entityType: 'Media',
              entityId: item._id.toString(),
              operation: 'purge',
            },
          });
        }
      } catch (err: any) {
        logger.error(`[Sweeper] Failed to sweep pending deletes: ${err.message}`);
      }
    },
    300, // 5 min lock
    0, // no retries
    0,
    false, // don't throw if lock fails (just means another worker is doing it)
  );
};
