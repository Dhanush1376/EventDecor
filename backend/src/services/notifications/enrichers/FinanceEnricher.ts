import logger from '../../../config/logger';

export class FinanceEnricher {
  /**
   * Enriches financial data for an order or transaction.
   * Useful for finance team notifications and admin digests.
   */
  public static enrichOrderFinance(order: any): Record<string, any> {
    if (!order) return {};

    try {
      // Basic order amounts
      const grossRevenue = order.total || 0;
      const shipping = order.shippingFee || 0;
      const subtotal = order.subtotal || 0;
      const discount = order.discount || 0;

      // Simulated calculations that would normally be derived from detailed DB queries or settings
      const gstRate = 0.18;
      const gstAmount = Math.round(subtotal * gstRate);
      const netRevenue = grossRevenue - gstAmount - shipping;

      // Approximating margin & vendor payouts (if applicable)
      const avgMarginRate = 0.4;
      const estimatedProfit = netRevenue * avgMarginRate;
      const vendorPayout = netRevenue - estimatedProfit;

      const paymentGatewayFee = Math.round(grossRevenue * 0.02); // 2% gateway fee approx

      return {
        grossRevenue,
        netRevenue,
        taxes: {
          total: gstAmount,
          rate: '18%',
        },
        fees: {
          shipping,
          platformFee: order.platformFee || 0,
          gatewayFee: paymentGatewayFee,
        },
        discounts: {
          couponCode: order.couponCode || 'None',
          discountAmount: discount,
          loyaltyCoinsUsed: order.walletDeduction || 0,
        },
        profitability: {
          estimatedProfit,
          vendorPayout,
          marginPercentage: '40%',
        },
      };
    } catch (error) {
      logger.error(`[FINANCE ENRICHER] Error enriching finance data:`, error);
      return {};
    }
  }
}
