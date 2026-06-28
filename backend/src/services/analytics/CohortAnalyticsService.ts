import Order from '../../models/Order';
import logger from '../../config/logger';

export class CohortAnalyticsService {
  /**
   * Calculates dynamic RFM cohorts for all customers.
   */
  public static async getRFMCohorts(): Promise<
    Record<string, { count: number; ltv: string; totalRevenue: number }>
  > {
    try {
      const usersData = await Order.aggregate([
        {
          $match: {
            paymentStatus: { $in: ['paid', 'COD Collected', 'captured'] },
            orderStatus: { $nin: ['Cancelled', 'Returned', 'Refunded'] },
          },
        },
        {
          $group: {
            _id: '$user',
            lastOrderDate: { $max: '$createdAt' },
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$total' },
          },
        },
      ]);

      const segments = {
        Champions: { count: 0, totalLTV: 0 },
        'Loyal Customers': { count: 0, totalLTV: 0 },
        'Potential Loyalists': { count: 0, totalLTV: 0 },
        'Recent Customers': { count: 0, totalLTV: 0 },
        Promising: { count: 0, totalLTV: 0 },
        'Customers Needing Attention': { count: 0, totalLTV: 0 },
        'About to Sleep': { count: 0, totalLTV: 0 },
        'At Risk': { count: 0, totalLTV: 0 },
        'Cannot Lose Them': { count: 0, totalLTV: 0 },
        Hibernating: { count: 0, totalLTV: 0 },
        Lost: { count: 0, totalLTV: 0 },
      };

      const now = new Date();

      usersData.forEach((user) => {
        // Calculate Recency (days)
        const daysSinceLastOrder = Math.floor(
          (now.getTime() - new Date(user.lastOrderDate).getTime()) / (1000 * 3600 * 24),
        );
        let r = 1;
        if (daysSinceLastOrder <= 30) r = 5;
        else if (daysSinceLastOrder <= 90) r = 4;
        else if (daysSinceLastOrder <= 180) r = 3;
        else if (daysSinceLastOrder <= 365) r = 2;
        else r = 1;

        // Calculate Frequency
        let f = 1;
        if (user.totalOrders >= 10) f = 5;
        else if (user.totalOrders >= 5) f = 4;
        else if (user.totalOrders >= 3) f = 3;
        else if (user.totalOrders >= 2) f = 2;
        else f = 1;

        // Calculate Monetary
        let m = 1;
        if (user.totalSpent >= 50000) m = 5;
        else if (user.totalSpent >= 25000) m = 4;
        else if (user.totalSpent >= 10000) m = 3;
        else if (user.totalSpent >= 5000) m = 2;
        else m = 1;

        // Average F and M
        const fm = Math.ceil((f + m) / 2);

        let segment = 'Lost';

        if (r >= 4 && fm >= 4) segment = 'Champions';
        else if (r >= 3 && fm >= 3) segment = 'Loyal Customers';
        else if (r >= 4 && fm <= 2) segment = 'Recent Customers';
        else if (r === 3 && fm <= 2) segment = 'Promising';
        else if (r >= 3 && fm <= 3) segment = 'Potential Loyalists';
        else if (r === 2 && fm >= 3) segment = 'Customers Needing Attention';
        else if (r === 2 && fm <= 2) segment = 'About to Sleep';
        else if (r === 1 && fm >= 4) segment = 'Cannot Lose Them';
        else if (r === 1 && fm === 3) segment = 'At Risk';
        else if (r === 1 && fm === 2) segment = 'Hibernating';
        else if (r === 1 && fm === 1) segment = 'Lost';

        segments[segment as keyof typeof segments].count += 1;
        segments[segment as keyof typeof segments].totalLTV += user.totalSpent;
      });

      // Format output
      const result: Record<string, { count: number; ltv: string; totalRevenue: number }> = {};

      Object.keys(segments).forEach((key) => {
        const seg = segments[key as keyof typeof segments];
        const avgLTV = seg.count > 0 ? Math.round(seg.totalLTV / seg.count) : 0;

        result[key] = {
          count: seg.count,
          ltv: `₹${avgLTV.toLocaleString('en-IN')}`,
          totalRevenue: seg.totalLTV,
        };
      });

      return result;
    } catch (error) {
      logger.error('Error calculating RFM Cohorts:', error);
      throw error;
    }
  }
}
