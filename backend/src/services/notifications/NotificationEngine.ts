import { NotificationEvent, NotificationContext, RecipientRole } from './types';
import { NotificationRegistry } from './NotificationRegistry';
import { DataEnricher } from './enrichers/DataEnricher';
import { NotificationPolicyEngine } from './NotificationPolicyEngine';
import { NotificationDispatcher } from './NotificationDispatcher';
import logger from '../../config/logger';

export class NotificationEngine {
  /**
   * Universal entry point for triggering any notification event in the system.
   */
  public static async notify(
    event: NotificationEvent | string,
    context: NotificationContext,
  ): Promise<void> {
    try {
      const config = NotificationRegistry.getConfig(event as NotificationEvent);

      if (!config) {
        logger.warn(`[NOTIFICATION ENGINE] Unknown event triggered: ${event}`);
        return;
      }

      logger.info(`[NOTIFICATION ENGINE] Processing event: ${event}`);
      context.metadata = { ...context.metadata, category: config.category };

      // 1. Enrich Data (Customer, Product, Finance, Delivery)
      const enrichedData = await DataEnricher.enrich(
        config.category,
        context.aggregateId,
        context.metadata?.payload || {},
      );
      enrichedData.subject = context.metadata?.subject; // Optional override

      // 2. Resolve Recipients & Filter by User Policies (Opt-outs, Rate limits)
      const approvedRecipients = await NotificationPolicyEngine.evaluatePolicies(
        context,
        config,
        enrichedData,
      );
      const actualRecipients = await this.resolveRecipients(approvedRecipients, enrichedData);

      // 3. Dispatch to Channels
      for (const recipient of actualRecipients) {
        for (const channelConfig of recipient.channels) {
          if (!channelConfig.enabled) continue;

          // Idempotency check per recipient+channel
          if (config.idempotent) {
            const isDuplicate = await NotificationPolicyEngine.checkIdempotency(
              context,
              recipient,
              channelConfig.channel,
            );
            if (isDuplicate) continue;
          }

          // Offload to Dispatcher
          await NotificationDispatcher.dispatch(
            context,
            recipient,
            channelConfig.channel,
            enrichedData,
            channelConfig.priority || context.priority,
          );
        }
      }

      logger.info(`[NOTIFICATION ENGINE] Successfully processed event: ${event}`);
    } catch (error) {
      logger.error(`[NOTIFICATION ENGINE] Error processing event ${event}:`, error);
      throw error; // Let Outbox processor handle retries and dead-letter
    }
  }

  private static async resolveRecipients(recipientsConfig: any[], enrichedData: any) {
    const resolved = [];

    for (const r of recipientsConfig) {
      if (r.role === RecipientRole.CUSTOMER) {
        if (enrichedData.user || enrichedData.email) {
          resolved.push({
            role: r.role,
            channels: r.channels,
            email: enrichedData.email || enrichedData.user?.email,
            phone: enrichedData.phone || enrichedData.user?.phone,
          });
        }
      } else if (
        r.role === RecipientRole.ADMIN ||
        r.role === RecipientRole.SUPER_ADMIN ||
        r.role === RecipientRole.FINANCE
      ) {
        // In a real app, query Users where role === ADMIN.
        // We'll use the environment variable for admins as a placeholder.
        const { getAdminEmails } = require('../../config/adminConfig');
        const adminEmails = getAdminEmails();
        for (const adminEmail of adminEmails) {
          resolved.push({
            role: r.role,
            channels: r.channels,
            email: adminEmail,
            phone: null,
          });
        }
      }
    }

    return resolved;
  }
}
