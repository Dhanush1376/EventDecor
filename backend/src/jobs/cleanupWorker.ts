import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import logger from '../config/logger';
import { GlobalAssetCleanupService } from '../services/GlobalAssetCleanupService';
import { deadLetterQueue } from './queues';
import { AlertingService } from '../services/AlertingService';

export const createCleanupWorker = (connection: Redis) => {
  const worker = new Worker(
    'cleanupQueue',
    async (job: Job) => {
      logger.info(
        `[CleanupWorker] Processing job ${job.id} of type ${job.name} (Attempt ${job.attemptsMade + 1})`,
      );

      try {
        switch (job.name) {
          case 'clean-replaced-assets': {
            const { oldData, newData, context } = job.data;
            await GlobalAssetCleanupService.cleanReplacedAssets(oldData, newData, context);
            break;
          }
          case 'clean-all-assets': {
            const { data, context } = job.data;
            await GlobalAssetCleanupService.cleanAllAssets(data, context);
            break;
          }
          default:
            logger.warn(`[CleanupWorker] Unknown job type: ${job.name}`);
        }
      } catch (error: any) {
        logger.error(`[CleanupWorker] Job ${job.id} (${job.name}) failed: ${error.message}`);
        throw error; // Trigger BullMQ retry
      }
    },
    { connection: connection as any, concurrency: 5 },
  );

  worker.on('completed', (job: Job) => {
    logger.info(`[CleanupWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) {
      logger.error(`[CleanupWorker] Unknown job failed: ${err.message}`);
      return;
    }

    logger.error(`[CleanupWorker] Job ${job.id} failed after retries: ${err.message}`);

    // Check if max attempts reached
    if (job.attemptsMade >= (job.opts?.attempts ?? 5)) {
      try {
        await deadLetterQueue.add('cleanup-failed', {
          originalJob: job.name,
          originalData: job.data,
          error: err.message,
          failedAt: new Date().toISOString(),
        });

        await AlertingService.fire({
          title: 'Asset Cleanup Failed (Dead Letter)',
          message: `Cleanup job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`,
          severity: 'high',
          category: 'system',
          metadata: { jobId: job.id, jobName: job.name, data: job.data },
        });
      } catch (dlqErr: any) {
        logger.error(
          `[CleanupWorker] Failed to move job ${job.id} to dead letter queue: ${dlqErr.message}`,
        );
      }
    }
  });

  return worker;
};
