import { Job } from 'bullmq';
import logger from '../../../config/logger';
import { whatsappDispatchQueue } from '../../../jobs/whatsappQueues';
import { AutomationPayload, AutomationContext } from './types';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import { RecipientResolver } from './RecipientResolver';
import { WhatsAppTemplateEngine } from './WhatsAppTemplateEngine';
import { PriorityEngine } from './PriorityEngine';
import { FeatureFlagService } from '../../../services/FeatureFlagService';

export class WhatsAppAutomationEngine {
  /**
   * Primary entry point. Called from controllers.
   * Target: < 50ms to enqueue, dispatch happens async via BullMQ worker.
   */
  static async trigger(automationKey: string, payload: AutomationPayload): Promise<void> {
    try {
      const isEngineEnabled = await FeatureFlagService.isEnabled('whatsapp_engine', true);
      if (!isEngineEnabled) {
        logger.debug(
          `[WhatsAppAutomationEngine] Engine disabled via feature flag. Ignoring ${automationKey}`,
        );
        return;
      }

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
   * Synchronous dry-run for API testing.
   */
  static async dryRun(automationKey: string, payload: AutomationPayload): Promise<any> {
    const automation = await WhatsAppAutomation.findOne({ automationKey }).populate(
      'recipientRoles.recipientId',
    );
    if (!automation) throw new Error('Automation not found');

    const recipients = await RecipientResolver.resolve(automation);
    const context = await this.enrichContext(payload);

    const priorityResult = await PriorityEngine.evaluate(context);
    const allBadges = [...priorityResult.badges.map((b) => `${b.emoji} ${b.label}`)];

    const { SmartRouter } = require('./SmartRouter');
    const provider = await SmartRouter.getRoute(automation.category || 'utility');

    const results = [];
    // Extract action nodes
    const actionNodes = (automation.nodes || []).filter(
      (n) => n.type === 'action_whatsapp' || n.id.startsWith('action'),
    );

    for (const recipient of recipients) {
      for (const node of actionNodes) {
        const templateId = node.data?.templateId;
        if (!templateId) continue;

        const template = await WhatsAppTemplateEngine.getTemplate(templateId.toString());
        if (!template) continue;

        const renderedMessage = await WhatsAppTemplateEngine.render(
          template,
          context,
          allBadges,
          automation.sections,
        );

        const { WhatsAppCostEngine } = require('./WhatsAppCostEngine');
        const costInfo = await WhatsAppCostEngine.calculateCost(
          provider.name,
          template.templateCategory || 'utility',
          recipient.phone,
        );

        results.push({
          recipient: recipient.phone,
          provider: provider.name,
          templateName: template.name,
          renderedMessage,
          costInfo,
          badges: allBadges,
          priority: priorityResult.priority,
        });
      }
    }

    return results;
  }

  /**
   * Called by the BullMQ worker.
   */
  static async process(job: Job): Promise<void> {
    const { automationKey, payload, currentNodeId } = job.data;
    try {
      const automation = await WhatsAppAutomation.findOne({ automationKey }).lean();
      if (!automation) return;

      const { WorkflowExecutionEngine } = require('./WorkflowExecutionEngine');
      await WorkflowExecutionEngine.executeWorkflow(
        automation._id.toString(),
        payload,
        currentNodeId,
      );
    } catch (error) {
      logger.error(`[WhatsAppAutomationEngine] Error processing job ${job.id}`, error);
      throw error;
    }
  }

  private static async enrichContext(payload: AutomationPayload): Promise<AutomationContext> {
    const Order = require('../../../models/Order').default || require('../../../models/Order');
    const Product =
      require('../../../models/Product').default || require('../../../models/Product');

    const StoreSettings =
      require('../../../models/StoreSettings').default || require('../../../models/StoreSettings');
    const storeSettings = (await StoreSettings.findOne().lean()) || {};
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
      storeSettings,
    };
  }
}
