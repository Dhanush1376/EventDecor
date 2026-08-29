import mongoose, { Schema, Document } from 'mongoose';
import logger from '../config/logger';

export interface IOutboxEvent extends Document {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: any;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutboxEventSchema: Schema = new Schema(
  {
    aggregateId: { type: String, required: true },
    aggregateType: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PUBLISHED', 'FAILED'],
      default: 'PENDING',
    },
    retryCount: { type: Number, default: 0 },
    errorDetails: { type: String },
  },
  { timestamps: true },
);

OutboxEventSchema.index({ status: 1, createdAt: 1 });
OutboxEventSchema.index({ aggregateId: 1, aggregateType: 1 });

/**
 * POST-SAVE HOOK: Inline Outbox Processing
 *
 * This is the CRITICAL fix for the entire notification/email system.
 *
 * WHY THIS EXISTS:
 * - OTP emails work because they call sendDirectEmail() directly
 * - All other transactional emails (orders, bookings, returns, etc.) are
 *   routed through the Outbox pattern: business code creates an OutboxEvent,
 *   and a cron processor picks it up and fires emails/notifications.
 * - But ENABLE_CRON=false disables the cron processor entirely.
 * - Without this hook, outbox events sit as PENDING forever.
 *
 * HOW IT WORKS:
 * - After every OutboxEvent document is saved, we schedule inline processing
 *   using setImmediate() so it runs after the current MongoDB transaction commits.
 * - The outbox processor handles emails, admin notifications, loyalty, refunds, etc.
 * - If processing fails, it's logged and the event stays PENDING for cron retry.
 * - This makes the system work WITHOUT cron AND without Redis.
 */
OutboxEventSchema.post('save', function (doc: any) {
  if (doc.status !== 'PENDING') return; // Only process new/pending events

  setTimeout(async () => {
    try {
      const { processOutboxEventById } = await import('../jobs/outboxProcessor.js');
      await processOutboxEventById(doc._id.toString());
    } catch (err: any) {
      logger.error(`[OUTBOX-HOOK] Failed to inline-process event ${doc._id}: ${err?.message}`);
    }
  }, 2500); // 2.5s delay to ensure the transaction commits
});

// @ts-expect-error - mongoose 7.x schema generic issue on method assignment
OutboxEventSchema.post('insertMany', function (docs: any[]) {
  docs.forEach((doc) => {
    if (doc.status !== 'PENDING') return;

    setTimeout(async () => {
      try {
        const { processOutboxEventById } = require('../jobs/outboxProcessor');
        await processOutboxEventById(doc._id.toString());
      } catch (err: any) {
        logger.error(`[OUTBOX-HOOK] Failed to inline-process event ${doc._id}: ${err?.message}`);
      }
    }, 2500); // 2.5s delay to ensure the transaction commits
  });
});

const OutboxEvent = mongoose.model<IOutboxEvent>('OutboxEvent', OutboxEventSchema);
export default OutboxEvent;
