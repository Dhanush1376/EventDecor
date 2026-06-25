import User from '../../../models/User';
import Order from '../../../models/Order';
import logger from '../../../config/logger';

export class CustomerEnricher {
  /**
   * Enriches notification payloads with comprehensive customer intelligence data.
   * Useful for admin alerts to provide full context on the user.
   */
  public static async enrich(userId: string | undefined): Promise<Record<string, any>> {
    if (!userId) return {};

    try {
      const user = await User.findById(userId).lean();
      if (!user) return {};

      // Calculate Lifetime Value (LTV), AOV, and Order Count efficiently
      const orderStats = await Order.aggregate([
        { $match: { user: user._id, paymentStatus: { $in: ['paid', 'captured'] } } },
        {
          $group: {
            _id: null,
            lifetimeSpend: { $sum: '$total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
      ]);

      const stats = orderStats[0] || { lifetimeSpend: 0, orderCount: 0, avgOrderValue: 0 };

      return {
        customerInfo: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || 'N/A',
          role: user.role,
          accountCreated: user.createdAt,
          lastLogin: user.lastLogin || 'N/A',
          isVerified: user.isVerified,
          loyaltyTier: user.loyaltyTier,
          siriCoins: user.siriCoins,
          walletBalance: user.walletBalance,
        },
        customerStats: {
          lifetimeSpend: Math.round(stats.lifetimeSpend * 100) / 100,
          orderCount: stats.orderCount,
          averageOrderValue: Math.round(stats.avgOrderValue * 100) / 100,
          wishlistCount: user.wishlist?.length || 0,
          cartSize: user.cart?.length || 0,
          referralsCount: user.referralsCount || 0,
        },
        deviceInfo: {
          // These would typically be extracted from the request context or session logs
          // Providing placeholders that the calling controller can override
          ip: 'Included from Request',
          browser: 'Included from Request',
          os: 'Included from Request',
        },
      };
    } catch (error) {
      logger.error(`[CUSTOMER ENRICHER] Error enriching customer data for ${userId}:`, error);
      return {};
    }
  }
}
