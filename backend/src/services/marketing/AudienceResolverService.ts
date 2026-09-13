import mongoose from 'mongoose';
import User from '../../models/User';
import ConsentPreference from '../../models/ConsentPreference';
import CampaignSegment, { ISegmentRule } from '../../models/CampaignSegment';
import logger from '../../config/logger';

export interface IAudienceCriteria {
  type?: 'all' | 'segment' | 'custom_filter' | 'specific_customers';
  segmentId?: string | mongoose.Types.ObjectId;
  customerIds?: (string | mongoose.Types.ObjectId)[];
  filterRules?: ISegmentRule[];
  combinator?: 'AND' | 'OR';
  role?: string;
  consentedOnly?: boolean;
}

export interface IRecipientInfo {
  userId: string;
  email: string;
  name: string;
  firstName: string;
  totalSpent: number;
  ordersCount: number;
  cartCount: number;
  loyaltyTier: string;
}

export class AudienceResolverService {
  /**
   * Translates filter rules into MongoDB aggregation conditions
   */
  private static buildRuleCondition(rule: ISegmentRule): any {
    const { field, operator, value } = rule;
    const numVal = Number(value);

    switch (field) {
      case 'totalSpent':
        if (operator === 'greater_than') return { totalSpent: { $gt: numVal } };
        if (operator === 'less_than') return { totalSpent: { $lt: numVal } };
        if (operator === 'equals') return { totalSpent: { $eq: numVal } };
        break;

      case 'ordersCount':
        if (operator === 'greater_than') return { ordersCount: { $gt: numVal } };
        if (operator === 'less_than') return { ordersCount: { $lt: numVal } };
        if (operator === 'equals') return { ordersCount: { $eq: numVal } };
        break;

      case 'lastOrderDays': {
        const targetDate = new Date(Date.now() - numVal * 24 * 60 * 60 * 1000);
        if (operator === 'greater_than') return { lastOrderDate: { $lt: targetDate } }; // older than X days
        if (operator === 'less_than') return { lastOrderDate: { $gt: targetDate } }; // within last X days
        break;
      }

      case 'hasActiveCart':
        if (operator === 'is_true' || value === true || value === 'true') {
          return { cartItemsCount: { $gt: 0 } };
        } else {
          return { cartItemsCount: 0 };
        }

      case 'neverPurchased':
        if (operator === 'is_true' || value === true || value === 'true') {
          return { ordersCount: 0 };
        } else {
          return { ordersCount: { $gt: 0 } };
        }

      case 'loyaltyTier':
        if (operator === 'equals') return { loyaltyTier: value };
        if (operator === 'not_equals') return { loyaltyTier: { $ne: value } };
        break;

      case 'emailConsent':
        if (operator === 'is_true' || value === true || value === 'true') {
          return { promotionsConsent: { $ne: false } };
        } else {
          return { promotionsConsent: false };
        }

      default:
        break;
    }
    return {};
  }

  /**
   * Generates the aggregation pipeline to match, enrich, and filter customers
   */
  private static async buildPipeline(criteria: IAudienceCriteria): Promise<any[]> {
    let rules: ISegmentRule[] = [];
    let combinator = criteria.combinator || 'AND';

    // If criteria points to a saved segment, fetch rules from database
    if (criteria.type === 'segment' && criteria.segmentId) {
      const segment = await CampaignSegment.findById(criteria.segmentId).lean();
      if (segment) {
        rules = segment.rules || [];
        combinator = segment.combinator || 'AND';
      }
    } else if (criteria.filterRules && criteria.filterRules.length > 0) {
      rules = criteria.filterRules;
    }

    const initialMatch: any = {
      role: { $in: ['customer', 'user'] },
      email: { $exists: true, $ne: '' },
    };

    // If specific customers selected
    if (
      criteria.type === 'specific_customers' &&
      criteria.customerIds &&
      criteria.customerIds.length > 0
    ) {
      initialMatch._id = {
        $in: criteria.customerIds.map((id) => new mongoose.Types.ObjectId(id.toString())),
      };
    }

    // Consent check (default true for marketing)
    if (criteria.consentedOnly !== false) {
      initialMatch['notificationPreferences.categories.promotions'] = { $ne: false };
    }

    const pipeline: any[] = [
      { $match: initialMatch },
      // Lookup completed orders for spent & order count aggregations
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                orderStatus: { $in: ['Confirmed', 'Processing', 'Delivered', 'Settled'] },
              },
            },
            {
              $project: {
                total: 1,
                createdAt: 1,
              },
            },
          ],
          as: 'userOrders',
        },
      },
      // Compute enriched fields
      {
        $addFields: {
          ordersCount: { $size: '$userOrders' },
          totalSpent: { $sum: '$userOrders.total' },
          lastOrderDate: { $max: '$userOrders.createdAt' },
          cartItemsCount: { $size: { $ifNull: ['$cart', []] } },
          promotionsConsent: '$notificationPreferences.categories.promotions',
        },
      },
    ];

    // Apply rule conditions if any
    if (rules.length > 0) {
      const conditionList = rules
        .map((r) => this.buildRuleCondition(r))
        .filter((c) => Object.keys(c).length > 0);
      if (conditionList.length > 0) {
        if (combinator === 'OR') {
          pipeline.push({ $match: { $or: conditionList } });
        } else {
          pipeline.push({ $match: { $and: conditionList } });
        }
      }
    }

    return pipeline;
  }

  /**
   * Computes matching recipient count in real-time
   */
  static async countAudience(
    criteria: IAudienceCriteria,
  ): Promise<{ totalMatched: number; eligibleRecipients: number; suppressedCount: number }> {
    try {
      const pipeline = await this.buildPipeline(criteria);

      // Clone pipeline to run count
      const countPipeline = [...pipeline, { $count: 'matchedCount' }];
      const result = await User.aggregate(countPipeline);
      const totalMatched = result[0]?.matchedCount || 0;

      // Check how many of these are on visitor unsubscribed list
      const matchedUsers = await User.aggregate([...pipeline, { $project: { email: 1 } }]);
      const emails = matchedUsers.map((u) => u.email?.toLowerCase()).filter(Boolean);

      const suppressedRecords = await ConsentPreference.countDocuments({
        consentToken: { $in: emails },
        marketingEmails: false,
      });

      const eligibleRecipients = Math.max(0, totalMatched - suppressedRecords);

      return {
        totalMatched,
        eligibleRecipients,
        suppressedCount: suppressedRecords,
      };
    } catch (err: any) {
      logger.error(`[AudienceResolverService.countAudience] Error: ${err.message}`);
      return { totalMatched: 0, eligibleRecipients: 0, suppressedCount: 0 };
    }
  }

  /**
   * Resolves list of recipients with pagination or streaming
   */
  static async resolveRecipients(
    criteria: IAudienceCriteria,
    options: { skip?: number; limit?: number } = {},
  ): Promise<IRecipientInfo[]> {
    try {
      const pipeline = await this.buildPipeline(criteria);

      // Add projections
      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          loyaltyTier: { $ifNull: ['$loyaltyTier', 'Bronze'] },
          ordersCount: 1,
          totalSpent: 1,
          cartItemsCount: 1,
        },
      });

      if (options.skip) {
        pipeline.push({ $skip: options.skip });
      }
      if (options.limit) {
        pipeline.push({ $limit: options.limit });
      }

      const users = await User.aggregate(pipeline);

      // Exclude any suppressed in ConsentPreference
      const userEmails = users.map((u) => u.email.toLowerCase());
      const suppressedList = await ConsentPreference.find({
        consentToken: { $in: userEmails },
        marketingEmails: false,
      }).select('consentToken');

      const suppressedSet = new Set(suppressedList.map((s) => s.consentToken.toLowerCase()));

      return users
        .filter((u) => !suppressedSet.has(u.email.toLowerCase()))
        .map((u) => {
          const rawName = u.name || 'Valued Customer';
          const firstName = rawName.split(' ')[0] || rawName;
          return {
            userId: u._id.toString(),
            email: u.email,
            name: rawName,
            firstName,
            totalSpent: u.totalSpent || 0,
            ordersCount: u.ordersCount || 0,
            cartCount: u.cartItemsCount || 0,
            loyaltyTier: u.loyaltyTier,
          };
        });
    } catch (err: any) {
      logger.error(`[AudienceResolverService.resolveRecipients] Error: ${err.message}`);
      return [];
    }
  }

  /**
   * System Pre-Built Segments Definition & Real-time Live Calculation
   */
  static getSystemSegmentDefinitions(): Array<{
    systemKey: string;
    name: string;
    description: string;
    rules: ISegmentRule[];
    combinator: 'AND' | 'OR';
  }> {
    return [
      {
        systemKey: 'vip_customers',
        name: 'VIP High Spenders',
        description: 'Customers who have spent more than ₹5,000 across their lifetime orders.',
        rules: [{ field: 'totalSpent', operator: 'greater_than', value: 5000 }],
        combinator: 'AND',
      },
      {
        systemKey: 'first_time_buyers',
        name: 'First-Time Buyers',
        description: 'Customers who have placed exactly 1 completed order and may need onboarding.',
        rules: [{ field: 'ordersCount', operator: 'equals', value: 1 }],
        combinator: 'AND',
      },
      {
        systemKey: 'repeat_buyers',
        name: 'Loyal Returning Customers',
        description: 'Customers who have placed 2 or more completed orders.',
        rules: [{ field: 'ordersCount', operator: 'greater_than', value: 1 }],
        combinator: 'AND',
      },
      {
        systemKey: 'never_purchased',
        name: 'Unconverted Leads',
        description: 'Registered users who have not yet placed their first order.',
        rules: [{ field: 'neverPurchased', operator: 'is_true', value: true }],
        combinator: 'AND',
      },
      {
        systemKey: 'abandoned_cart_users',
        name: 'Active Cart Holders',
        description: 'Customers who currently have products waiting in their shopping cart.',
        rules: [{ field: 'hasActiveCart', operator: 'is_true', value: true }],
        combinator: 'AND',
      },
      {
        systemKey: 'inactive_60_days',
        name: 'At-Risk Inactive (60+ Days)',
        description: 'Customers who have not purchased in over 60 days.',
        rules: [
          { field: 'ordersCount', operator: 'greater_than', value: 0 },
          { field: 'lastOrderDays', operator: 'greater_than', value: 60 },
        ],
        combinator: 'AND',
      },
    ];
  }

  /**
   * Generates live smart recommendations driven by actual database state
   */
  static async getSmartRecommendations(): Promise<
    Array<{
      id: string;
      type: 'abandoned_cart' | 'win_back' | 'vip';
      title: string;
      description: string;
      actionLabel: string;
      eligibleCount: number;
      defaultCampaignData: Record<string, any>;
    }>
  > {
    const recommendations: Array<{
      id: string;
      type: 'abandoned_cart' | 'win_back' | 'vip';
      title: string;
      description: string;
      actionLabel: string;
      eligibleCount: number;
      defaultCampaignData: Record<string, any>;
    }> = [];

    try {
      // 1. Abandoned Carts
      const cartUsers = await this.countAudience({
        type: 'custom_filter',
        filterRules: [{ field: 'hasActiveCart', operator: 'is_true', value: true }],
      });
      if (cartUsers.eligibleRecipients > 0) {
        recommendations.push({
          id: 'rec_abandoned_cart',
          type: 'abandoned_cart',
          title: `${cartUsers.eligibleRecipients} customers have items waiting in their carts`,
          description:
            'Recover potential lost revenue with an automatic cart reminder and quick checkout button.',
          actionLabel: 'Recover Carts',
          eligibleCount: cartUsers.eligibleRecipients,
          defaultCampaignData: {
            title: 'Cart Recovery Special',
            subject: 'Did you leave something special behind?',
            previewText: 'Your handcrafted treasures are reserved and waiting for you.',
            category: 'abandoned_cart',
            audienceType: 'abandoned_cart',
          },
        });
      }

      // 2. Win-Back Inactive Customers (60+ days)
      const inactiveUsers = await this.countAudience({
        type: 'custom_filter',
        filterRules: [
          { field: 'ordersCount', operator: 'greater_than', value: 0 },
          { field: 'lastOrderDays', operator: 'greater_than', value: 60 },
        ],
      });
      if (inactiveUsers.eligibleRecipients > 0) {
        recommendations.push({
          id: 'rec_win_back',
          type: 'win_back',
          title: `${inactiveUsers.eligibleRecipients} customers haven't purchased in 60+ days`,
          description: 'Re-engage previous patrons with a limited-time celebration discount code.',
          actionLabel: 'Create Win-Back Campaign',
          eligibleCount: inactiveUsers.eligibleRecipients,
          defaultCampaignData: {
            title: 'We Miss You — Special Celebration Offer',
            subject: 'We miss you! Here is something special just for you',
            previewText: 'Enjoy an exclusive 15% discount on your next handcrafted decor order.',
            category: 'promotional',
            audienceType: 'inactive_60',
          },
        });
      }

      // 3. VIP Customers (> ₹5,000 spend)
      const vipUsers = await this.countAudience({
        type: 'custom_filter',
        filterRules: [{ field: 'totalSpent', operator: 'greater_than', value: 5000 }],
      });
      if (vipUsers.eligibleRecipients > 0) {
        recommendations.push({
          id: 'rec_vip',
          type: 'vip',
          title: `${vipUsers.eligibleRecipients} VIP high-value customers eligible for rewards`,
          description:
            'Send a private preview of our newest bridal trays and sacred decor collections.',
          actionLabel: 'Create VIP Campaign',
          eligibleCount: vipUsers.eligibleRecipients,
          defaultCampaignData: {
            title: 'VIP Exclusive: Private Heritage Collection Preview',
            subject: 'Exclusive VIP Preview: Curated Heritage Decor for You',
            previewText: 'A private invitation for our most cherished patrons.',
            category: 'promotional',
            audienceType: 'vip',
          },
        });
      }
    } catch (err: any) {
      logger.error(`[AudienceResolverService.getSmartRecommendations] Error: ${err.message}`);
    }

    return recommendations;
  }
}

export default AudienceResolverService;
