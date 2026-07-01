import logger from '../config/logger';
import mongoose from 'mongoose';

type FallbackHandler = (jobName: string, data: any) => Promise<void>;

/**
 * DurableFallbackQueue â€” MongoDB-backed queue that persists jobs to survive process restarts.
 *
 * When BullMQ/Redis is unavailable, jobs are written to MongoDB (FallbackJob collection)
 * and processed in-memory. On process restart, pending jobs are recovered from MongoDB
 * and retried automatically.
 *
 * Dead-lettered jobs (>3 retries) are preserved for admin review.
 */

// Lightweight inline Mongoose model (avoids circular import with models/)
const FallbackJobSchema = new mongoose.Schema({
  queueName: { type: String, required: true, index: true },
  jobName: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'dead_letter'],
    default: 'pending',
    index: true,
  },
  retries: { type: Number, default: 0 },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
  processedAt: { type: Date },
});

FallbackJobSchema.index({ queueName: 1, status: 1, createdAt: 1 });

const FallbackJob = mongoose.models.FallbackJob || mongoose.model('FallbackJob', FallbackJobSchema);

const MAX_RETRIES = 3;

class FallbackQueue {
  private isProcessing = false;

  constructor(
    public name: string,
    private handler: FallbackHandler,
  ) {}

  async add(jobName: string, data: any) {
    try {
      // Persist to MongoDB for durability
      if (mongoose.connection.readyState === 1) {
        await FallbackJob.create({
          queueName: this.name,
          jobName,
          data,
          status: 'pending',
          retries: 0,
        });
        logger.info(
          `[QUEUE FALLBACK] Persisted job ${jobName} to MongoDB fallback queue: ${this.name}`,
        );
      } else {
        logger.warn(
          `[QUEUE FALLBACK] MongoDB unavailable â€” job ${jobName} in ${this.name} will be lost if process restarts`,
        );
      }
    } catch (err: any) {
      logger.error(`[QUEUE FALLBACK] Failed to persist job ${jobName}: ${err.message}`);
    }

    // Process immediately in-memory
    this.processNext();
    return { id: `fallback-${Date.now()}` };
  }

  private async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Atomically claim the next pending job
      const job = await FallbackJob.findOneAndUpdate(
        { queueName: this.name, status: 'pending' },
        { $set: { status: 'processing' }, $inc: { retries: 1 } },
        { sort: { createdAt: 1 }, returnDocument: 'after' },
      );

      if (!job) {
        this.isProcessing = false;
        return;
      }

      try {
        logger.info(
          `[QUEUE FALLBACK] Processing ${job.jobName} in ${this.name} (attempt ${job.retries}/${MAX_RETRIES})`,
        );
        await this.handler(job.jobName, job.data);

        // Mark as completed
        await FallbackJob.findByIdAndUpdate(job._id, {
          $set: { status: 'completed', processedAt: new Date() },
        });
      } catch (err: any) {
        logger.error(
          `[QUEUE FALLBACK] Error processing ${job.jobName} in ${this.name}: ${err.message}`,
        );

        if (job.retries >= MAX_RETRIES) {
          // Move to dead letter
          await FallbackJob.findByIdAndUpdate(job._id, {
            $set: { status: 'dead_letter', errorMessage: err.message },
          });
          logger.error(
            `[QUEUE FALLBACK] Job ${job.jobName} in ${this.name} moved to dead letter after ${MAX_RETRIES} attempts`,
          );

          // Alert admins
          try {
            const { createAdminNotification } = require('./notificationService');
            await createAdminNotification({
              title: 'Fallback Queue Dead Letter',
              message: `Job "${job.jobName}" in queue "${this.name}" failed after ${MAX_RETRIES} attempts: ${err.message}`,
              type: 'system',
            });
          } catch (notifErr) {
            logger.error(`[QUEUE FALLBACK] Failed to create dead letter notification: ${notifErr}`);
          }
        } else {
          // Reset to pending for retry with backoff
          await FallbackJob.findByIdAndUpdate(job._id, {
            $set: { status: 'pending', errorMessage: err.message },
          });
          setTimeout(() => this.processNext(), 5000 * job.retries);
        }
      }
    } catch (dbErr: any) {
      logger.error(`[QUEUE FALLBACK] Database error in ${this.name}: ${dbErr.message}`);
    }

    this.isProcessing = false;
    // Check for more pending jobs
    setImmediate(() => this.processNext());
  }

  async close() {
    // No-op â€” jobs are persisted in MongoDB
  }
}

export class QueueFallbackService {
  private static queues = new Map<string, FallbackQueue>();

  static getQueue(name: string): any {
    if (!this.queues.has(name)) {
      this.queues.set(name, new FallbackQueue(name, this.getHandler(name)));
    }
    return this.queues.get(name);
  }

  /**
   * Recover pending jobs from MongoDB on startup (called after DB connection established).
   * Replays any jobs that were persisted but not completed before last shutdown.
   */
  static async recoverPendingJobs(): Promise<number> {
    try {
      if (mongoose.connection.readyState !== 1) return 0;

      // Reset any stuck 'processing' jobs back to 'pending'
      const resetResult = await FallbackJob.updateMany(
        { status: 'processing' },
        { $set: { status: 'pending' } },
      );
      if (resetResult.modifiedCount > 0) {
        logger.info(
          `[QUEUE FALLBACK] Reset ${resetResult.modifiedCount} stuck processing jobs to pending`,
        );
      }

      const pendingCount = await FallbackJob.countDocuments({ status: 'pending' });
      if (pendingCount > 0) {
        logger.info(
          `[QUEUE FALLBACK] Recovering ${pendingCount} pending fallback jobs from MongoDB`,
        );

        // Trigger processing for each queue that has pending jobs
        const distinctQueues = await FallbackJob.distinct('queueName', { status: 'pending' });
        for (const queueName of distinctQueues) {
          const queue = this.getQueue(queueName);
          // Kick off processing
          (queue as any).processNext?.();
        }
      }

      return pendingCount;
    } catch (err: any) {
      logger.error(`[QUEUE FALLBACK] Failed to recover pending jobs: ${err.message}`);
      return 0;
    }
  }

  /**
   * Clean up completed jobs older than 24 hours (called by CRON).
   */
  static async cleanupCompletedJobs(): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await FallbackJob.deleteMany(
        {
          status: 'completed',
          processedAt: { $lt: oneDayAgo },
        },
        { bypassDestructionGuard: true } as any,
      );
      return result.deletedCount;
    } catch (err: any) {
      logger.error(`[QUEUE FALLBACK] Cleanup failed: ${err.message}`);
      return 0;
    }
  }

  /**
   * Get dead-lettered jobs for admin review.
   */
  static async getDeadLetterJobs(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      FallbackJob.find({ status: 'dead_letter' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FallbackJob.countDocuments({ status: 'dead_letter' }),
    ]);
    return { jobs, total, page, totalPages: Math.ceil(total / limit) };
  }

  private static getHandler(queueName: string): FallbackHandler {
    return async (jobName: string, data: any) => {
      switch (queueName) {
        case 'emailQueue': {
          const { sendDirectEmailProcessor } = require('./notificationService');
          await sendDirectEmailProcessor(data);
          break;
        }
        case 'webhookQueue': {
          const { UnifiedWebhookRouter } = require('./payments/UnifiedWebhookRouter');
          await UnifiedWebhookRouter.routeWebhookEvent(
            data.event,
            data.body,
            data.signature,
            data.eventId,
          );
          break;
        }
        case 'refundQueue': {
          const { PaymentRefundService } = require('./PaymentRefundService');
          await PaymentRefundService.processRefundAsyncCore(data.refundRecordId);
          break;
        }
        case 'notificationQueue': {
          const { createAdminNotification } = require('./notificationService');
          await createAdminNotification(data);
          break;
        }
        case 'recommendationQueue':
          logger.warn(
            `[QUEUE FALLBACK] Ignoring recommendation task ${jobName} since it is heavy for memory queue`,
          );
          break;
        default:
          logger.warn(`[QUEUE FALLBACK] No fallback handler mapped for ${queueName}`);
      }
    };
  }
}
