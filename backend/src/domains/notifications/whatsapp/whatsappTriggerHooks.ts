import { WhatsAppAutomationEngine } from './WhatsAppAutomationEngine';

export const WhatsAppTriggers = {
  onOrderCreated: (orderId: string) => WhatsAppAutomationEngine.trigger('new_order', { orderId }),

  onCodOrder: (orderId: string) => WhatsAppAutomationEngine.trigger('cod_order', { orderId }),

  onPaidOrder: (orderId: string) => WhatsAppAutomationEngine.trigger('paid_order', { orderId }),

  onPaymentFailed: (orderId: string) =>
    WhatsAppAutomationEngine.trigger('payment_failed', { orderId }),

  onLowInventory: (productId: string, currentStock: number) =>
    WhatsAppAutomationEngine.trigger('low_inventory', { productId, currentStock }),

  onDailySummary: () => WhatsAppAutomationEngine.trigger('daily_summary', {}),

  onAbandonedCart: (cartId: string, userId: string) =>
    WhatsAppAutomationEngine.trigger('abandoned_cart', { cartId, userId }),

  onOutForDelivery: (orderId: string) =>
    WhatsAppAutomationEngine.trigger('out_for_delivery', { orderId }),

  onOrderDelivered: (orderId: string) =>
    WhatsAppAutomationEngine.trigger('order_delivered', { orderId }),

  onReviewRequest: (orderId: string) =>
    WhatsAppAutomationEngine.trigger('review_request', { orderId }),
};
