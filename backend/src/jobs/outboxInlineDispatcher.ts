/**
 * OutboxInlineDispatcher
 *
 * Processes outbox events IMMEDIATELY after they are created,
 * without depending on cron jobs or Redis/BullMQ.
 *
 * This is the critical fix: OTP emails work because they call sendDirectEmail
 * directly. All other transactional emails were routed through the outbox,
 * which depends on a cron processor that was disabled (ENABLE_CRON=false).
 *
 * This module ensures outbox events fire their side-effects inline.
 */
import logger from '../config/logger';

/**
 * Schedule inline processing of an outbox event after the current
 * event loop tick (to ensure the MongoDB transaction has committed).
 *
 * Usage:
 *   await OutboxEvent.create([{ ... }], { session });
 *   await session.commitTransaction();
 *   scheduleOutboxProcessing(outboxEventId);
 */
export const scheduleOutboxProcessing = (eventId: string) => {
  // Use setImmediate to ensure the transaction has fully committed
  // before we try to read the event from the database
  setImmediate(async () => {
    try {
      const { processOutboxEventById } = require('./outboxProcessor');
      await processOutboxEventById(eventId);
    } catch (err: any) {
      logger.error(`[OUTBOX-DISPATCH] Failed to inline-process event ${eventId}: ${err?.message}`);
    }
  });
};

/**
 * For OutboxEvent.create() that returns an array of created docs,
 * schedule processing for all of them.
 */
export const scheduleOutboxProcessingBatch = (eventIds: string[]) => {
  for (const id of eventIds) {
    scheduleOutboxProcessing(id);
  }
};
