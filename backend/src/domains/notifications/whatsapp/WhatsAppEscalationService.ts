import { Job } from 'bullmq';
import { whatsappEscalationQueue } from '../../../jobs/whatsappQueues';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import logger from '../../../config/logger';

export class WhatsAppEscalationService {
  /**
   * Schedule a check in the future to see if the message was read.
   * If not read, an escalation process will begin.
   */
  static async scheduleEscalationCheck(
    messageLogId: string,
    timeoutMinutes: number,
    escalateToRoles: string[],
    reminderMessage: string,
  ): Promise<void> {
    const delayMs = timeoutMinutes * 60 * 1000;

    await whatsappEscalationQueue.add(
      'check-escalation',
      {
        messageLogId,
        escalateToRoles,
        reminderMessage,
      },
      {
        delay: delayMs,
        jobId: `escalate_${messageLogId}`, // Prevent duplicate checks
      },
    );

    logger.info(
      `[WhatsAppEscalation] Scheduled check for log ${messageLogId} in ${timeoutMinutes}m`,
    );
  }

  /**
   * Process the delayed check.
   */
  static async processEscalation(job: Job): Promise<void> {
    const { messageLogId, escalateToRoles, reminderMessage } = job.data;

    const log = await WhatsAppMessageLog.findById(messageLogId);
    if (!log) {
      logger.warn(`[WhatsAppEscalation] Message log ${messageLogId} not found.`);
      return;
    }

    // If delivery status is 'read', customer acknowledged it. Cancel escalation.
    if (log.deliveryStatus === 'read') {
      logger.info(`[WhatsAppEscalation] Message ${messageLogId} was read. Escalation bypassed.`);
      return;
    }

    // Otherwise, they didn't read it in time. We need to escalate!
    logger.warn(
      `[WhatsAppEscalation] ESCALATION TRIGGERED for message ${messageLogId}. Status is still '${log.deliveryStatus}'.`,
    );

    // Here we would typically dispatch an SMS or push a notification to the manager dashboard.
    // For now, we simulate a system-level alert.
    logger.info(
      `[WhatsAppEscalation] Alerting roles: ${escalateToRoles.join(', ')} with message: "${reminderMessage}"`,
    );

    // In a full implementation, you would add a job to `notificationQueue` or send an SMS.
    // Example:
    // await notificationQueue.add('send-system-alert', { roles: escalateToRoles, message: reminderMessage });

    // Update log history
    log.statusHistory.push({
      status: 'escalated',
      timestamp: new Date(),
      reason: `Message not read within timeout. Alerted ${escalateToRoles.join(', ')}.`,
    });

    await log.save();
  }
}
