import mongoose from 'mongoose';
import RewardCampaign from '../models/RewardCampaign';
import RewardRule, {
  IRuleCondition,
  IRuleConditionGroup,
  IRuleOutcome,
} from '../models/RewardRule';
import User from '../models/User';
import WalletTransaction from '../models/WalletTransaction';
import Coupon from '../models/Coupon';
import logger from '../config/logger';

export interface RuleContext {
  user: any;
  order?: any;
  review?: any;
  [key: string]: any;
}

export class RuleEngine {
  /**
   * Evaluates all active campaigns and rules for a given trigger event and applies outcomes.
   */
  static async evaluateTrigger(triggerEvent: string, context: RuleContext) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      // Find active campaigns that are within date range or have no dates
      const activeCampaigns = await RewardCampaign.find({
        status: 'active',
        isDeleted: false,
        $and: [
          { $or: [{ startDate: { $lte: now } }, { startDate: null }] },
          { $or: [{ endDate: { $gte: now } }, { endDate: null }] },
        ],
      })
        .sort({ priority: -1 })
        .session(session);

      if (activeCampaigns.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const campaignIds = activeCampaigns.map((c) => c._id);

      // Find active rules for these campaigns matching the trigger event
      const activeRules = await RewardRule.find({
        campaignId: { $in: campaignIds },
        isActive: true,
        triggerEvent: triggerEvent as any,
      }).session(session);

      let appliedOutcomes = 0;

      for (const rule of activeRules) {
        if (this.evaluateConditions(rule.conditions, context)) {
          await this.applyOutcomes(rule.outcomes, context, rule, session);
          appliedOutcomes++;
        }
      }

      await session.commitTransaction();
      if (appliedOutcomes > 0) {
        logger.info(
          `RuleEngine evaluated trigger ${triggerEvent}: applied ${appliedOutcomes} outcomes.`,
        );
      }
    } catch (err) {
      await session.abortTransaction();
      logger.error(`RuleEngine failed for trigger ${triggerEvent}:`, err);
    } finally {
      session.endSession();
    }
  }

  /**
   * Recursively evaluates a condition group (AND/OR) against the provided context.
   */
  private static evaluateConditions(group: IRuleConditionGroup, context: RuleContext): boolean {
    if (!group || !group.conditions || group.conditions.length === 0) return true; // Empty conditions = pass

    const evaluateCondition = (cond: IRuleCondition | IRuleConditionGroup): boolean => {
      // If it's a nested group
      if ('logic' in cond) {
        return this.evaluateConditions(cond as IRuleConditionGroup, context);
      }

      // It's a single condition
      const condition = cond as IRuleCondition;
      const contextValue = this.resolveFieldValue(condition.field, context);

      switch (condition.operator) {
        case 'equals':
          return contextValue == condition.value;
        case 'not_equals':
          return contextValue != condition.value;
        case 'greater_than':
          return Number(contextValue) > Number(condition.value);
        case 'less_than':
          return Number(contextValue) < Number(condition.value);
        case 'contains':
          if (typeof contextValue === 'string') {
            return contextValue.includes(condition.value);
          }
          if (Array.isArray(contextValue)) {
            return contextValue.includes(condition.value);
          }
          return false;
        case 'in':
          if (Array.isArray(condition.value)) {
            return condition.value.includes(contextValue);
          }
          return false;
        default:
          return false;
      }
    };

    if (group.logic === 'AND') {
      return group.conditions.every(evaluateCondition);
    } else if (group.logic === 'OR') {
      return group.conditions.some(evaluateCondition);
    }

    return false;
  }

  /**
   * Resolves dot-notation field paths (e.g. 'order.total') from the context object.
   */
  private static resolveFieldValue(path: string, context: any): any {
    return path
      .split('.')
      .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), context);
  }

  /**
   * Applies the defined outcomes if conditions are met.
   */
  private static async applyOutcomes(
    outcomes: IRuleOutcome[],
    context: RuleContext,
    rule: any,
    session: mongoose.mongo.ClientSession,
  ) {
    const userId = context.user?._id;
    if (!userId) return;

    for (const outcome of outcomes) {
      switch (outcome.type) {
        case 'credit_wallet': {
          const amount = Number(outcome.value.amount);
          if (amount > 0) {
            const user = await User.findById(userId).session(session);
            if (user) {
              const balanceBefore = user.walletBalance || 0;
              const balanceAfter = balanceBefore + amount;

              await User.findByIdAndUpdate(userId, { walletBalance: balanceAfter }, { session });

              await WalletTransaction.create(
                [
                  {
                    userId,
                    type: 'credit',
                    amount,
                    source: 'admin_adjustment', // Generic source for dynamic campaigns
                    description: `Campaign Reward: ${rule.name}`,
                    balanceBefore,
                    balanceAfter,
                    status: 'active',
                  },
                ],
                { session },
              );
            }
          }
          break;
        }

        case 'issue_coupon': {
          const crypto = require('crypto');
          const code = `CMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
          await Coupon.create(
            [
              {
                code,
                discountType: outcome.value.discountType || 'percentage',
                discountValue: outcome.value.discountValue || 10,
                minOrderAmount: outcome.value.minOrderAmount || 0,
                maxDiscount: outcome.value.maxDiscount || 0,
                startDate: new Date(),
                expiryDate: new Date(
                  Date.now() + (outcome.value.expiryDays || 30) * 24 * 60 * 60 * 1000,
                ),
                usageLimit: 1,
                isActive: true,
              },
            ],
            { session },
          );
          break;
        }

        case 'multiplier_points':
          // Multiplier logic usually applies inline during purchase processing,
          // but if it applies a flat bonus, we can add it to user's siriCoins.
          break;

        case 'tier_upgrade':
          await User.findByIdAndUpdate(
            userId,
            { loyaltyTier: outcome.value.tierName },
            { session },
          );
          break;
      }
    }
  }
}
