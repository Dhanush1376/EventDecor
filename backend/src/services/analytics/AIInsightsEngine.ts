import User from '../../models/User';
import logger from '../../config/logger';

export class AIInsightsEngine {
  /**
   * Runs the rule-based AI engine to generate insights comparing the current period to the previous period.
   * Typically run during the snapshot generation job.
   */
  static async generateInsights(currentSnapshot: any, previousSnapshot: any) {
    const insights: any[] = [];

    if (!previousSnapshot || !currentSnapshot) return insights;

    try {
      // 1. Revenue Insights
      const revChange = this.calcPercentChange(
        previousSnapshot.metrics.totalRevenue,
        currentSnapshot.metrics.totalRevenue,
      );
      if (revChange > 10) {
        insights.push({
          category: 'revenue',
          message: `Revenue increased by ${revChange.toFixed(1)}% compared to the previous period.`,
          severity: 'positive',
          metric: 'totalRevenue',
          change: revChange,
        });
      } else if (revChange < -10) {
        insights.push({
          category: 'revenue',
          message: `Revenue dropped by ${Math.abs(revChange).toFixed(1)}% compared to the previous period.`,
          severity: 'negative',
          metric: 'totalRevenue',
          change: revChange,
        });
      }

      // 2. Cart Abandonment Insights
      const cartChange = this.calcAbsoluteChange(
        previousSnapshot.metrics.cartAbandonmentRate,
        currentSnapshot.metrics.cartAbandonmentRate,
      );
      if (cartChange > 15) {
        insights.push({
          category: 'funnel',
          message: `Cart abandonment increased significantly by ${cartChange.toFixed(1)}%. Check checkout flow for friction.`,
          severity: 'warning',
          metric: 'cartAbandonmentRate',
          change: cartChange,
        });
      } else if (cartChange < -10) {
        insights.push({
          category: 'funnel',
          message: `Cart abandonment improved by ${Math.abs(cartChange).toFixed(1)}%.`,
          severity: 'positive',
          metric: 'cartAbandonmentRate',
          change: cartChange,
        });
      }

      // 3. Search Insights
      const zeroResultChange = this.calcAbsoluteChange(
        this.calcZeroResultRate(previousSnapshot.metrics),
        this.calcZeroResultRate(currentSnapshot.metrics),
      );
      if (zeroResultChange > 10) {
        insights.push({
          category: 'search',
          message: `Search failure rate (zero results) increased by ${zeroResultChange.toFixed(1)}%. Review top zero-result keywords.`,
          severity: 'warning',
          metric: 'zeroResultRate',
          change: zeroResultChange,
        });
      }

      // 4. VIP Churn Risk
      // We look at users in the 'vip' tier who haven't logged in for 30+ days.
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const atRiskVips = await User.countDocuments({
        loyaltyTier: { $in: ['Platinum', 'Gold'] },
        lastLogin: { $lt: thirtyDaysAgo },
      });
      if (atRiskVips > 10) {
        insights.push({
          category: 'churn_risk',
          message: `${atRiskVips} high-value (VIP/Gold) customers have not visited in 30 days.`,
          severity: 'warning',
          metric: 'vipChurn',
          change: atRiskVips,
        });
      }

      // 5. Traffic Channel Shifts
      const curInsta = this.getTraffic(currentSnapshot.metrics.trafficSources, 'instagram');
      const curFb = this.getTraffic(currentSnapshot.metrics.trafficSources, 'facebook');
      if (curInsta.conversions > 0 && curFb.conversions > 0) {
        if (curInsta.conversions > curFb.conversions * 2) {
          insights.push({
            category: 'attribution',
            message: `Instagram drives ${Math.round(curInsta.conversions / curFb.conversions)}× more conversions than Facebook this period.`,
            severity: 'info',
            metric: 'instagram_vs_facebook',
            change: 0,
          });
        }
      }

      // 6. Search Intent Shifts
      const curWedding = this.getSearchIntent(currentSnapshot.metrics.topSearches, 'wedding_decor');
      const prevWedding = this.getSearchIntent(
        previousSnapshot.metrics.topSearches,
        'wedding_decor',
      );
      const weddingDemandChange = this.calcPercentChange(prevWedding, curWedding);
      if (weddingDemandChange > 20) {
        insights.push({
          category: 'demand',
          message: `Wedding decor demand increased by ${weddingDemandChange.toFixed(1)}% — consider restocking inventory.`,
          severity: 'info',
          metric: 'weddingDemand',
          change: weddingDemandChange,
        });
      }
    } catch (error) {
      logger.error('Error generating AI insights', error);
    }

    return insights;
  }

  private static calcPercentChange(oldVal: number, newVal: number) {
    if (!oldVal || oldVal === 0) return 0;
    return ((newVal - oldVal) / oldVal) * 100;
  }

  private static calcAbsoluteChange(oldVal: number, newVal: number) {
    return newVal - (oldVal || 0);
  }

  private static calcZeroResultRate(metrics: any) {
    const zeroResults =
      metrics.zeroResultSearches?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0;
    const totalSearches = metrics.totalSearches || 1; // Prevent div by 0
    return (zeroResults / totalSearches) * 100;
  }

  private static getTraffic(sources: any[], channelName: string) {
    return (
      sources?.find((s: any) => s.channel === channelName) || {
        visitors: 0,
        conversions: 0,
        revenue: 0,
      }
    );
  }

  private static getSearchIntent(searches: any[], intentName: string) {
    return (
      searches
        ?.filter((s: any) => s.intent === intentName)
        .reduce((acc: number, curr: any) => acc + curr.count, 0) || 0
    );
  }
}
