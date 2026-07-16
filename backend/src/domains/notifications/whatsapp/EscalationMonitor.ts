import logger from '../../../config/logger';
import Order from '../../../models/Order';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import { whatsappDispatchQueue } from '../../../jobs/whatsappQueues';

export class EscalationMonitor {
  static async checkUnprocessedOrders(): Promise<void> {
    logger.info(`[EscalationMonitor] Checking for unprocessed orders...`);

    try {
      // 1. Fetch WhatsAppAutomation configs where escalation.enabled = true
      const escalations = await WhatsAppAutomation.find({
        'escalation.enabled': true,
        isActive: true,
      }).lean();

      if (!escalations || escalations.length === 0) return;

      for (const auto of escalations) {
        if (!auto.escalation || !auto.escalation.timeoutMinutes) continue;

        // 2. Query Orders collection for status 'Pending' where updatedAt < (now - timeout)
        const timeoutMs = auto.escalation.timeoutMinutes * 60 * 1000;
        const thresholdDate = new Date(Date.now() - timeoutMs);

        // Fetch orders that are stale and haven't been escalated yet
        const staleOrders = await Order.find({
          orderStatus: 'Pending',
          updatedAt: { $lt: thresholdDate },
          'metadata.escalated': { $ne: true }, // Prevent duplicate escalations
        }).lean();

        for (const order of staleOrders) {
          logger.warn(
            `[EscalationMonitor] Order ${order._id} breached SLA. Triggering escalation.`,
          );

          // 3. Dispatch escalation WhatsApp message
          // Enqueue with the specific escalation automation ID
          await whatsappDispatchQueue.add('dispatch-escalation', {
            automationId: auto._id,
            payload: { orderId: order._id, type: 'escalation' },
          });

          // Mark as escalated so we don't trigger it repeatedly
          await Order.findByIdAndUpdate(order._id, {
            $set: { 'metadata.escalated': true },
          });
        }
      }
    } catch (error) {
      logger.error(`[EscalationMonitor] Error checking unprocessed orders`, error);
    }
  }
}
