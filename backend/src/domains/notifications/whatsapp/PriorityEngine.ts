import { AutomationContext, PriorityResult, Badge } from './types';
import WhatsAppPriorityConfig from '../../../models/WhatsAppPriorityConfig';

export class PriorityEngine {
  static async evaluate(context: AutomationContext): Promise<PriorityResult> {
    const config = (await WhatsAppPriorityConfig.findOne().lean()) || {
      highValueOrderThreshold: 20000,
      vipSpendThreshold: 50000,
      expressDeliveryThreshold: 24,
      lowInventoryThreshold: 10,
    };
    const badges: Badge[] = [];
    let priority: 'critical' | 'high' | 'normal' | 'low' = 'normal';

    if (context.order?.total > config.highValueOrderThreshold) {
      badges.push({ emoji: '🚨', label: 'HIGH VALUE ORDER', color: 'red' });
      priority = 'high';
    }

    if (
      context.customerStats?.totalSpent > config.vipSpendThreshold ||
      context.customerStats?.totalOrders >= 10
    ) {
      badges.push({ emoji: '⭐', label: 'VIP CUSTOMER', color: 'gold' });
      priority = 'high';
    }

    if (context.order?.paymentStatus === 'Pending COD') {
      badges.push({ emoji: '💰', label: 'CASH ON DELIVERY', color: 'orange' });
    }

    if (context.order?.shippingFee > 200) {
      badges.push({ emoji: '⚡', label: 'EXPRESS DELIVERY', color: 'blue' });
      priority = 'high';
    }

    if (context.products?.some((p) => p.fragile)) {
      badges.push({ emoji: '⚠️', label: 'HANDLE WITH CARE — FRAGILE', color: 'yellow' });
    }

    if (context.order?.needByDate) {
      const hoursUntil = (new Date(context.order.needByDate).getTime() - Date.now()) / 3600000;
      if (hoursUntil <= config.expressDeliveryThreshold && hoursUntil > 0) {
        badges.push({ emoji: '🔴', label: 'EVENT TOMORROW — URGENT', color: 'red' });
        priority = 'critical';
      }
    }

    if (context.inventoryData?.some((inv) => inv.remainingStock < config.lowInventoryThreshold)) {
      badges.push({ emoji: '📦', label: 'LOW STOCK ALERT', color: 'orange' });
    }

    if (
      context.order?.items?.length >= 5 ||
      context.order?.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) >= 10
    ) {
      badges.push({ emoji: '📦', label: 'LARGE ORDER', color: 'blue' });
    }

    if (context.customerStats?.totalOrders > 1) {
      badges.push({
        emoji: '🔄',
        label: `RETURNING CUSTOMER (Order #${context.customerStats.totalOrders})`,
        color: 'green',
      });
    }

    return { badges, priority };
  }
}
