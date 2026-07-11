import { Job } from 'bullmq';
import logger from '../../../config/logger';
import { whatsappDispatchQueue } from '../../../jobs/whatsappQueues';
import { AutomationPayload, AutomationContext } from './types';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import { RecipientResolver } from './RecipientResolver';
import { WhatsAppTemplateEngine } from './WhatsAppTemplateEngine';
import { PriorityEngine } from './PriorityEngine';
import { WhatsAppConditionEvaluator } from './WhatsAppConditionEvaluator';
import { MediaAttachmentService } from './MediaAttachmentService';
import { WhatsAppProviderFactory } from './providers/WhatsAppProviderFactory';
import { WhatsAppDashboardService } from './WhatsAppDashboardService';
import { randomUUID as uuidv4 } from 'crypto';

export class WhatsAppAutomationEngine {
  /**
   * Primary entry point. Called from controllers.
   * Target: < 50ms to enqueue, dispatch happens async via BullMQ worker.
   */
  static async trigger(automationKey: string, payload: AutomationPayload): Promise<void> {
    try {
      logger.info(`[WhatsAppAutomationEngine] Triggering ${automationKey}`, { payload });

      // Enqueue to BullMQ for immediate processing
      await whatsappDispatchQueue.add(
        'dispatch-whatsapp',
        {
          automationKey,
          payload,
          triggerTimestamp: Date.now(),
        },
        {
          priority: 1, // High priority for real-time delivery
        },
      );
    } catch (error) {
      logger.error(`[WhatsAppAutomationEngine] Error triggering ${automationKey}`, error);
    }
  }

  /**
   * Called by the BullMQ worker.
   */
  static async process(job: Job): Promise<void> {
    const workerStart = Date.now();
    const { automationKey, payload, triggerTimestamp } = job.data;

    try {
      // 1. Load full automation config
      const automation = await WhatsAppAutomation.findOne({ automationKey }).populate(
        'recipientRoles.recipientId',
      );

      if (!automation || !automation.enabled) {
        logger.debug(
          `[WhatsAppAutomationEngine] Automation ${automationKey} is disabled or not found.`,
        );
        return;
      }

      // 2. Resolve recipients
      const recipients = await RecipientResolver.resolve(automation);
      if (recipients.length === 0) {
        logger.debug(`[WhatsAppAutomationEngine] No active recipients for ${automationKey}.`);
        return;
      }

      // 3. Enrich payload
      const context = await this.enrichContext(payload);

      // 4. Evaluate conditions & Priority
      const triggeredBadges = await WhatsAppConditionEvaluator.evaluate(
        automation.conditions,
        context,
      );
      const priorityResult = PriorityEngine.evaluate(context);

      const allBadges = [
        ...priorityResult.badges.map((b) => `${b.emoji} ${b.label}`),
        ...triggeredBadges,
      ];

      // 5. Setup Provider
      const provider = WhatsAppProviderFactory.getProvider();

      // 6. Process for each recipient
      for (const recipient of recipients) {
        const idempotencyKey =
          (payload as any).idempotencyKey ||
          `wa:${automationKey}:${payload.orderId || triggerTimestamp}:${recipient.phone}`;

        // --- IDEMPOTENCY CHECK ---
        const existingLog = await WhatsAppMessageLog.findOne({
          idempotencyKey,
          deliveryStatus: { $in: ['sent', 'delivered', 'read'] },
        });

        if (existingLog) {
          logger.info(
            `[WhatsAppAutomationEngine] Idempotency hit: Skipping duplicate message for ${idempotencyKey}`,
          );
          continue;
        }

        // Render Message
        const template = await WhatsAppTemplateEngine.getTemplate(
          automation.activeTemplateId?.toString(),
        );
        if (!template) {
          logger.error(
            `[WhatsAppAutomationEngine] Template not found for recipient ${recipient.phone}`,
          );
          continue;
        }

        const renderedMessage = await WhatsAppTemplateEngine.render(
          template,
          context,
          allBadges,
          automation.sections,
        );

        // Generate Media if needed
        let mediaUrl = null;
        if (automation.mediaAttachments?.sendInvoice && context.order) {
          mediaUrl = await MediaAttachmentService.generateInvoice(context.order._id);
        }

        // Dispatch via Provider Mapping Layer
        const dispatchStart = Date.now();
        const providerCallStart = Date.now();
        let response;
        try {
          if (template.templateCategory === 'utility') {
            const components =
              template.providerMapping?.map((mapping) => {
                return {
                  type: mapping.metaComponentType,
                  parameters: mapping.variables.map((variableKey) => {
                    const registry = (WhatsAppTemplateEngine as any).variableRegistry.get(
                      variableKey,
                    );
                    const val = registry ? registry.resolver(context) : '';
                    return { type: 'text', text: String(val) };
                  }),
                };
              }) || [];

            response = await provider.sendTemplateMessage(
              recipient.phone,
              template.metaTemplateName,
              template.metaTemplateLanguage,
              components,
            );
          } else {
            response = mediaUrl
              ? await provider.sendMediaMessage(recipient.phone, mediaUrl, renderedMessage)
              : await provider.sendTextMessage(recipient.phone, renderedMessage);
          }
        } catch (err: any) {
          logger.error(`[WhatsAppAutomationEngine] Provider error for ${recipient.phone}`, err);
          response = { success: false, raw: { error: err.message }, messageId: 'failed' };
        }

        const providerCallEnd = Date.now();
        const latencyMs = Date.now() - triggerTimestamp;

        // Log to DB
        const createdLog = await WhatsAppMessageLog.create({
          messageId: uuidv4(),
          automationKey,
          automationName: automation.displayName,
          recipientPhone: recipient.phone,
          recipientName: recipient.name,
          recipientRole: recipient.role,
          templateId: template._id,
          templateName: template.name,
          templateLayout: template.layout,
          renderedMessage,
          messageType: mediaUrl ? 'media' : 'template',
          attachments: mediaUrl
            ? [{ type: 'invoice', url: mediaUrl, filename: 'invoice.pdf' }]
            : [],
          deliveryStatus: response.success ? 'sent' : 'failed',
          failureReason: response.success ? undefined : response.raw?.error,
          sentAt: response.success ? new Date() : undefined,
          apiProvider: provider.name,
          apiResponse: response.raw,
          apiMessageId: response.messageId,
          relatedEntityType: payload.orderId ? 'order' : undefined,
          relatedEntityId: payload.orderId,
          idempotencyKey, // Re-using the key generated above
          priority: priorityResult.priority,
          triggeredBadges: allBadges,
          triggerTimestamp: new Date(triggerTimestamp),
          dispatchTimestamp: new Date(dispatchStart),
          latencyMs,
          timings: {
            triggeredAt: new Date(triggerTimestamp),
            queuedAt: new Date(triggerTimestamp),
            workerStartedAt: new Date(workerStart),
            providerCalledAt: new Date(providerCallStart),
            providerRespondedAt: new Date(providerCallEnd),
          },
        });

        // Trigger Retry Service if failed
        if (!response.success) {
          const { WhatsAppRetryService } = require('./WhatsAppRetryService');
          await WhatsAppRetryService.scheduleRetry(createdLog._id.toString());
        }

        // Update Dashboard Cache
        await WhatsAppDashboardService.incrementStats(
          response.success ? 'sent' : 'failed',
          automationKey,
          latencyMs,
        );
      }
    } catch (error) {
      logger.error(`[WhatsAppAutomationEngine] Error processing job ${job.id}`, error);
      throw error; // Let BullMQ handle retry via whatsapp-retry queue (to be implemented)
    }
  }

  private static async enrichContext(payload: AutomationPayload): Promise<AutomationContext> {
    const Order = require('../../../models/Order').default || require('../../../models/Order');
    const Product =
      require('../../../models/Product').default || require('../../../models/Product');
    const User = require('../../../models/User').default || require('../../../models/User');

    let order = null;
    let products = [];
    let customerStats = {};

    if (payload.orderId) {
      order = await Order.findById(payload.orderId).populate('user').lean();
      if (order && order.items && order.items.length > 0) {
        const productIds = order.items.map((i: any) => i.productId).filter(Boolean);
        products = await Product.find({ _id: { $in: productIds } }).lean();

        if (order.user) {
          const pastOrders = await Order.countDocuments({
            user: order.user._id,
            orderStatus: 'Delivered',
          });
          customerStats = { totalOrders: pastOrders };
        }
      }
    }

    return {
      order: order || payload,
      customerStats,
      products,
      inventoryData: [],
    };
  }
}
