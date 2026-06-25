import { NotificationEvent, NotificationPayload, NotificationChannel } from './types';
import { NotificationRegistry } from './NotificationRegistry';
import logger from '../../config/logger';
// Will import Adapters, Enrichers, and PreferenceService in subsequent phases.

export class NotificationEngine {
  /**
   * Universal entry point for triggering any notification event in the system.
   */
  public static async notify(
    event: NotificationEvent,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      const config = NotificationRegistry.getConfig(event);

      if (!config) {
        logger.warn(`[NOTIFICATION ENGINE] Unknown event triggered: ${event}`);
        return;
      }

      logger.info(`[NOTIFICATION ENGINE] Processing event: ${event}`);

      // 1. Enrich Data (Customer, Product, Finance, Delivery) - Phase 3/4
      const enrichedData = await this.enrichPayload(event, payload);

      // 2. Resolve Recipients & Filter by User Preferences - Phase 3
      const resolvedRecipients = await this.resolveRecipients(config.recipients, enrichedData);

      // 3. Dispatch to Channels - Phase 7
      for (const recipient of resolvedRecipients) {
        for (const channelConfig of recipient.channels) {
          if (!channelConfig.enabled) continue;

          await this.dispatchToChannel(
            channelConfig.channel,
            event,
            recipient,
            enrichedData,
            channelConfig.priority,
          );
        }
      }

      logger.info(`[NOTIFICATION ENGINE] Successfully processed event: ${event}`);
    } catch (error) {
      logger.error(`[NOTIFICATION ENGINE] Error processing event ${event}:`, error);
      // Fallback/DLQ handling - Phase 9
    }
  }

  private static async enrichPayload(event: NotificationEvent, payload: NotificationPayload) {
    // Stub: Will call CustomerEnricher, ProductEnricher, etc. based on payload
    return payload.data;
  }

  private static async resolveRecipients(recipientsConfig: any[], enrichedData: any) {
    // Stub: Will fetch actual users based on roles and check preferences
    return recipientsConfig.map((r) => ({
      role: r.role,
      channels: r.channels,
      // stub user identifiers
      email: enrichedData.email || 'test@example.com',
      phone: enrichedData.phone || '+1234567890',
      userId: enrichedData.userId || 'system',
    }));
  }

  private static async dispatchToChannel(
    channel: NotificationChannel,
    event: NotificationEvent,
    recipient: any,
    data: any,
    priority?: string,
  ) {
    // Stub: Route to the correct adapter
    logger.debug(
      `[NOTIFICATION ENGINE] Dispatching ${event} to ${recipient.role} via ${channel} [Priority: ${priority || 'normal'}]`,
    );

    // Switch on channel and call specific adapter
    // e.g., if channel === NotificationChannel.EMAIL -> EmailAdapter.send(...)
  }
}
