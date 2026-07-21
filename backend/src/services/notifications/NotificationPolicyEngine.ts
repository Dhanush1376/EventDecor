import NotificationLog from '../../models/NotificationLog';
import logger from '../../config/logger';
import { NotificationContext, EventRegistryConfig, RecipientConfig } from './types';

export class NotificationPolicyEngine {
  /**
   * Evaluates if a notification should be suppressed due to idempotency.
   */
  public static async checkIdempotency(
    context: NotificationContext,
    recipient: any,
    channel: string,
  ): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existingLog = await NotificationLog.findOne({
      action: context.eventId, // We use the specific event/outbox ID as the unique action identifier
      recipientEmail: recipient.email || recipient.phone,
      channel: channel as any,
      createdAt: { $gte: twentyFourHoursAgo },
      status: { $in: ['processing', 'sent', 'delivered', 'read', 'clicked'] },
    });

    if (existingLog) {
      logger.warn(
        `[POLICY ENGINE] Idempotency block: ${channel} already processed for event ${context.eventId}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Applies rate limits, quiet hours, and channel priority escalation rules.
   */
  public static async evaluatePolicies(
    context: NotificationContext,
    config: EventRegistryConfig,
    enrichedData: any,
  ): Promise<RecipientConfig[]> {
    // 1. In a full enterprise system, this is where we'd implement:
    // - Quiet Hours (e.g. don't send SMS at 3 AM unless priority is 'critical')
    // - Escalation (if Email fails, then SMS)
    // - Opt-outs (e.g. unsubscribe lists)

    // For now, we apply basic Opt-Out filtering for marketing
    if (config.category === 'engagement') {
      const isOptedOut =
        enrichedData.user?.notificationPreferences?.categories?.promotions === false;
      if (isOptedOut) {
        logger.info(
          `[POLICY ENGINE] Suppressed engagement notification for ${enrichedData.email} due to opt-out.`,
        );
        return [];
      }
    }

    return config.recipients;
  }
}
