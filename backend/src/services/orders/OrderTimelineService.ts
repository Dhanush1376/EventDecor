import OrderEvent from '../../models/OrderEvent';
import PaymentEvent from '../../models/PaymentEvent';
import InventoryEvent from '../../models/InventoryEvent';
import { emitAdminEvent, emitUserEvent } from '../../socket';
import logger from '../../config/logger';

export class OrderTimelineService {
  /**
   * Fetches the unified timeline for an order, aggregating all related events.
   */
  static async getOrderTimeline(orderId: string): Promise<any[]> {
    try {
      const [orderEvents, paymentEvents, inventoryEvents] = await Promise.all([
        OrderEvent.find({ orderId }).lean(),
        PaymentEvent.find({ orderId }).lean(),
        InventoryEvent.find({ orderId }).lean(),
      ]);

      const unifiedTimeline = [
        ...orderEvents.map((e: any) => ({ ...e, domain: 'order', timestamp: e.createdAt })),
        ...paymentEvents.map((e: any) => ({ ...e, domain: 'payment', timestamp: e.createdAt })),
        ...inventoryEvents.map((e: any) => ({ ...e, domain: 'inventory', timestamp: e.createdAt })),
      ];

      // Sort chronological
      unifiedTimeline.sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());

      return unifiedTimeline;
    } catch (err) {
      logger.error(`Error fetching timeline for order ${orderId}:`, err);
      return [];
    }
  }

  /**
   * Broadcasts a timeline event to connected admins and the specific user.
   */
  static broadcastEvent(userId: string | null, eventData: any) {
    if (userId) {
      emitUserEvent(userId.toString(), 'timeline_update', eventData);
    }
    emitAdminEvent('timeline_update', eventData);
  }
}
