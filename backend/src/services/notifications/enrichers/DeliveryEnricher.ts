import logger from '../../../config/logger';
import { getFrontendUrl } from '../../../utils/getFrontendUrl';

export class DeliveryEnricher {
  /**
   * Enriches delivery tracking and logistics data.
   */
  public static enrich(order: any): Record<string, any> {
    if (!order) return {};

    try {
      const frontendUrl = getFrontendUrl();
      const isCod = order.paymentMethod === 'cod' || order.paymentMethod === 'Cash on Delivery';

      const trackingUrl = order.trackingNumber
        ? `${frontendUrl}/track/${order._id}?token=${order.publicTrackingToken || ''}`
        : null;

      // Estimate ETA based on order creation date if no explicit ETA exists
      const orderDate = new Date(order.createdAt || Date.now());
      const estimatedDelivery = new Date(orderDate);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // Default 5 days

      return {
        shippingAddress: order.shippingAddress,
        courier: {
          partnerName: order.courierPartner || 'Standard Shipping',
          trackingNumber: order.trackingNumber || 'Pending',
          trackingUrl,
          status: order.orderStatus,
        },
        timeline: {
          orderPlaced: order.createdAt,
          expectedDelivery: estimatedDelivery.toISOString(),
          shippedAt:
            order.statusHistory?.find((h: any) => h.status === 'Shipped')?.timestamp || null,
          deliveredAt:
            order.statusHistory?.find((h: any) => h.status === 'Delivered')?.timestamp || null,
        },
        logistics: {
          weight: order.weight || 0,
          dimensions: order.dimensions || { length: 0, width: 0, height: 0 },
          packageType: order.packageType || 'Standard Box',
          isCod,
          codAmountToCollect: isCod && !order.codCollected ? order.total : 0,
        },
      };
    } catch (error) {
      logger.error(`[DELIVERY ENRICHER] Error enriching delivery data:`, error);
      return {};
    }
  }
}
