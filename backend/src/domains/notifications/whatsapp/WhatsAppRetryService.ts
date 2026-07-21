import { Job } from 'bullmq';
import mongoose from 'mongoose';
import logger from '../../../config/logger';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import { whatsappRetryQueue } from '../../../jobs/whatsappQueues';

export class WhatsAppRetryService {
  static async scheduleRetry(messageLogId: string): Promise<void> {
    const log = await WhatsAppMessageLog.findById(messageLogId);
    if (!log || log.retryCount >= log.maxRetries) {
      if (log) {
        log.deliveryStatus = 'failed';
        log.failureReason = 'Max retries exhausted';
        await log.save();
        await this.moveToDeadLetter(messageLogId);
      }
      return;
    }

    // Read intervals from environment config or fallback to defaults
    let defaultIntervals = [60, 300, 900, 1800];
    if (process.env.WA_RETRY_INTERVALS) {
      try {
        defaultIntervals = JSON.parse(process.env.WA_RETRY_INTERVALS);
      } catch (_e) {
        logger.warn('Failed to parse WA_RETRY_INTERVALS. Using defaults.');
      }
    }
    const delaySeconds = defaultIntervals[log.retryCount] || 3600;

    log.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
    log.retryCount += 1;
    await log.save();

    try {
      await whatsappRetryQueue.add(
        'retry-message',
        { messageLogId },
        { delay: delaySeconds * 1000 },
      );
      logger.info(
        `[WhatsAppRetryService] Scheduled retry ${log.retryCount} for ${messageLogId} in ${delaySeconds}s`,
      );
    } catch (err: any) {
      if (process.env.REQUIRE_REDIS === 'false') {
        const { QueueFallbackService } = require('../../../services/QueueFallbackService');
        QueueFallbackService.getQueue('whatsapp-retry').add(
          'retry-message',
          { messageLogId },
          { delay: delaySeconds * 1000 },
        );
        logger.info(
          `[WhatsAppRetryService] Scheduled retry ${log.retryCount} for ${messageLogId} via fallback`,
        );
      } else {
        throw err;
      }
    }
  }

  static async retryMessage(messageLogId: string): Promise<void> {
    logger.info(`[WhatsAppRetryService] Manual retry requested for ${messageLogId}`);
    const log = await WhatsAppMessageLog.findById(messageLogId);
    if (!log) throw new Error('Message log not found');

    log.retryCount = 0; // Reset
    await log.save();

    try {
      await whatsappRetryQueue.add('retry-message', { messageLogId }, { priority: 1 });
    } catch (err: any) {
      if (process.env.REQUIRE_REDIS === 'false') {
        const { QueueFallbackService } = require('../../../services/QueueFallbackService');
        QueueFallbackService.getQueue('whatsapp-retry').add(
          'retry-message',
          { messageLogId },
          { priority: 1 },
        );
      } else {
        throw err;
      }
    }
  }

  static async processRetry(job: Job): Promise<void> {
    const { messageLogId } = job.data;
    logger.info(`[WhatsAppRetryService] Processing retry for ${messageLogId}`);

    const log = await WhatsAppMessageLog.findById(messageLogId);
    if (!log) return;

    if (log.deliveryStatus === 'sent' || log.deliveryStatus === 'delivered') return; // Already successful

    try {
      const { SmartRouter } = require('./SmartRouter');
      const provider = await SmartRouter.getRoute('utility');

      let response;
      if (log.messageType === 'media' && log.attachments?.[0]?.url) {
        response = await provider.sendMediaMessage(
          log.recipientPhone,
          log.attachments[0].url,
          log.renderedMessage,
        );
      } else {
        // Need to handle utility/session payload replay if needed,
        // but for safety, we'll re-dispatch texts or use stored rawPayload if we add it.
        // Assuming fallback to text for now if it failed.
        response = await provider.sendTextMessage(log.recipientPhone, log.renderedMessage);
      }

      log.deliveryStatus = 'sent';
      log.sentAt = new Date();
      log.apiProvider = provider.name;
      log.apiMessageId = response.messageId;
      log.apiResponse = response.raw;
      await log.save();
    } catch (err: any) {
      log.failureReason = err.message;
      await log.save();
      // The error will be caught by BullMQ, which triggers the failed listener,
      // which calls scheduleRetry() again
      throw err;
    }
  }

  static async moveToDeadLetter(messageLogId: string): Promise<void> {
    logger.error(
      `[WhatsAppRetryService] Moving message ${messageLogId} to Dead Letter Queue (DB update)`,
    );
    // Create Dead Letter Entry
    const log = await WhatsAppMessageLog.findById(messageLogId).lean();
    if (log) {
      const DLQ = mongoose.connection.collection('whatsapp_dead_letter');
      await DLQ.insertOne({ ...log, movedToDLQAt: new Date() });
    }
  }
}
