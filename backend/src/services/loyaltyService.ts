import mongoose from 'mongoose';
import User from '../models/User';
import WalletTransaction from '../models/WalletTransaction';
import Order from '../models/Order';
import Coupon from '../models/Coupon';
import logger from '../config/logger';

export class LoyaltyService {
  /**
   * Generates a unique, elegant referral code for a new customer
   */
  static generateReferralCode(name: string): string {
    const prefix = 'SIRI';
    const sanitized = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${sanitized || 'ART'}-${rand}`;
  }

  /**
   * Welcomes a newly registered user with onboarding credits and generates their referral code
   */
  static async setupNewUserRewards(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // 1. Generate unique referral code
      const welcomeCash = 100;
      const refCode = user.referralCode || this.generateReferralCode(user.name);

      const updateQuery: any = {
        $inc: { walletBalance: welcomeCash }
      };
      const setFields: any = {};
      if (!user.referralCode) {
        setFields.referralCode = refCode;
      }
      if (!user.loyaltyTier) {
        setFields.loyaltyTier = 'Bronze';
      }
      if (Object.keys(setFields).length > 0) {
        updateQuery.$set = setFields;
      }

      await User.findByIdAndUpdate(userId, updateQuery);

      // Log the credit transaction in audit ledger
      await WalletTransaction.create({
        userId,
        type: 'credit',
        amount: welcomeCash,
        source: 'onboarding',
        description: 'Welcome Bonus: ₹100 Siri Cash credited to your loyalty wallet!',
        status: 'active'
      });

      // 3. Create Welcome Onboarding Coupon for the user
      const code = `WELCOME${Math.floor(10 + Math.random() * 90)}`;
      await Coupon.create({
        code,
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 499,
        maxDiscount: 200,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days expiry
        usageLimit: 1,
        usedCount: 0,
        isActive: true
      });

      logger.info(`Loyalty Welcome Setup successful for user: ${userId}`);
    } catch (err) {
      logger.error('Failed to setup welcome onboarding rewards:', err);
    }
  }

  /**
   * Process and apply purchase rewards (Cashback, Siri Coins, Tier upgrades) upon checkout completion
   */
  static async processPurchaseRewards(userId: string, orderId: string, totalSpend: number) {
    try {
      const user = await User.findById(userId);
      const order = await Order.findById(orderId);
      if (!user || !order) return;

      // 1. Calculate Siri Coins points earned (1 Coin per ₹10 spent on the order subtotal)
      const coinsEarned = Math.round(order.subtotal / 10);

      // 2. Calculate Cashback percentage based on loyalty tier
      let cashbackRate = 0.02; // Bronze: 2%
      if (user.loyaltyTier === 'Silver') cashbackRate = 0.05; // 5%
      else if (user.loyaltyTier === 'Gold') cashbackRate = 0.08; // 8%
      else if (user.loyaltyTier === 'Platinum') cashbackRate = 0.12; // 12%

      const cashbackEarned = Math.round((order.total || totalSpend) * cashbackRate);

      // Atomically credit siriCoins and walletBalance without read-modify-write saves
      await User.findByIdAndUpdate(userId, {
        $inc: {
          siriCoins: coinsEarned,
          walletBalance: cashbackEarned
        }
      });

      // 3. Update Order Document for dynamic receipt rendering
      order.coinsEarned = coinsEarned;
      order.cashbackEarned = cashbackEarned;
      await order.save();

      // Log Cashback Credit in transaction audit ledger
      if (cashbackEarned > 0) {
        await WalletTransaction.create({
          userId,
          type: 'credit',
          amount: cashbackEarned,
          source: 'purchase_cashback',
          description: `Earned ${Math.round(cashbackRate * 100)}% Siri Cashback on order #${order.invoiceNumber || orderId}`,
          orderId: order._id,
          status: 'active'
        });
      }

      // 4. Check for Referral Rewards on Referee's First Purchase
      const ordersCount = await Order.countDocuments({ user: userId, orderStatus: { $ne: 'Cancelled' } });
      if (ordersCount === 1 && user.referredBy) {
        await this.applyReferralBonus(user.referredBy.toString(), userId);
      }

      // 5. Evaluate Membership Tier Upgrades based on Lifetime Valid Purchases
      await this.evaluateTierUpgrades(userId);
    } catch (err) {
      logger.error(`Failed to process purchase rewards for order ${orderId}:`, err);
    }
  }

  /**
   * Applies referral bonus to both referrer and referee on referee's first purchase completion
   */
  static async applyReferralBonus(referrerId: string, refereeId: string) {
    try {
      const referrer = await User.findById(referrerId);
      const referee = await User.findById(refereeId);
      if (!referrer || !referee) return;

      // Credit ₹150 to Referrer atomically
      const referrerBonus = 150;
      await User.findByIdAndUpdate(referrerId, {
        $inc: { walletBalance: referrerBonus, referralsCount: 1 }
      });

      await WalletTransaction.create({
        userId: referrerId,
        type: 'credit',
        amount: referrerBonus,
        source: 'referral_bonus',
        description: `Referral Bonus: You referred ${referee.name || 'a friend'}!`,
        status: 'active'
      });

      // Credit ₹50 Extra to Referee as welcome wallet cash atomically
      const refereeBonus = 50;
      await User.findByIdAndUpdate(refereeId, {
        $inc: { walletBalance: refereeBonus }
      });

      await WalletTransaction.create({
        userId: refereeId,
        type: 'credit',
        amount: refereeBonus,
        source: 'referral_bonus',
        description: 'Referral Bonus: Welcome cash for joining via referral link!',
        status: 'active'
      });

      logger.info(`Referral bonus successfully applied between referrer: ${referrerId} and referee: ${refereeId}`);
    } catch (err) {
      logger.error('Failed to execute referral rewards:', err);
    }
  }

  /**
   * Evaluates user's cumulative spent or orders to unlock next Loyalty Tier status
   */
  static async evaluateTierUpgrades(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Calculate lifetime purchase spend (excluding cancelled orders)
      const validOrders = await Order.find({ user: userId, orderStatus: { $nin: ['Cancelled', 'Refunded'] } });
      const lifetimeSpend = validOrders.reduce((sum, ord) => sum + ord.total, 0);

      let newTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
      if (lifetimeSpend >= 40000) {
        newTier = 'Platinum';
      } else if (lifetimeSpend >= 15000) {
        newTier = 'Gold';
      } else if (lifetimeSpend >= 5000) {
        newTier = 'Silver';
      }

      if (user.loyaltyTier !== newTier) {
        const oldTier = user.loyaltyTier;
        await User.findByIdAndUpdate(userId, { loyaltyTier: newTier });
        logger.info(`User ${userId} upgraded loyalty membership tier from ${oldTier} to ${newTier}!`);
      }
    } catch (err) {
      logger.error(`Failed to evaluate tier upgrades for user ${userId}:`, err);
    }
  }

  /**
   * Process rating and review submission credits instantly
   */
  static async processReviewRewards(userId: string, rating: number, hasPhoto: boolean, hasVideo: boolean, reviewId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Determine review credits reward (Text: ₹10, Photo: ₹25, Video: ₹50)
      let rewardAmount = 10;
      let description = 'Text Review Credit';
      if (hasVideo) {
        rewardAmount = 50;
        description = 'Video Review Gold Credit';
      } else if (hasPhoto) {
        rewardAmount = 25;
        description = 'Photo Review Silver Credit';
      }

      // Atomically reward the user without read-modify-write saves
      await User.findByIdAndUpdate(userId, {
        $inc: {
          walletBalance: rewardAmount,
          siriCoins: 15
        }
      });

      await WalletTransaction.create({
        userId,
        type: 'credit',
        amount: rewardAmount,
        source: 'review_reward',
        description: `Review Bonus: Earned ₹${rewardAmount} siri cash for submitting ${description}`,
        status: 'active'
      });

      logger.info(`Instantly rewarded user ${userId} with ₹${rewardAmount} review cash.`);
    } catch (err) {
      logger.error('Failed to reward review writing:', err);
    }
  }

  /**
   * Reverse cashback and siri coins, and return used wallet amounts if order is cancelled or refunded
   */
  static async reversePurchaseRewards(orderId: string) {
    try {
      const order = await Order.findById(orderId);
      if (!order) return;

      const user = await User.findById(order.user);
      if (!user) return;

      const incFields: any = {};

      // 1. Re-credit spent wallet balance back to user's wallet
      if (order.walletDeduction && order.walletDeduction > 0) {
        incFields.walletBalance = (incFields.walletBalance || 0) + order.walletDeduction;
        
        await WalletTransaction.create({
          userId: user._id,
          type: 'credit',
          amount: order.walletDeduction,
          source: 'refund',
          description: `Restored spent wallet credits from cancelled order #${order.invoiceNumber || orderId}`,
          orderId: order._id,
          status: 'active'
        });
      }

      // 2. Revoke/Reverse any cashback earned on this order
      if (order.cashbackEarned && order.cashbackEarned > 0) {
        incFields.walletBalance = (incFields.walletBalance || 0) - order.cashbackEarned;
        
        await WalletTransaction.create({
          userId: user._id,
          type: 'debit',
          amount: order.cashbackEarned,
          source: 'reversal',
          description: `Revoked earned cashback from cancelled/refunded order #${order.invoiceNumber || orderId}`,
          orderId: order._id,
          status: 'active'
        });
      }

      // 3. Revoke earned Siri Coins
      if (order.coinsEarned && order.coinsEarned > 0) {
        incFields.siriCoins = -order.coinsEarned;
      }

      if (Object.keys(incFields).length > 0) {
        // Use an atomic pipeline update to deduct while clamping the lower bound to 0
        const setFields: any = {};
        if (incFields.walletBalance !== undefined) {
          setFields.walletBalance = {
            $max: [0, { $add: [{ $ifNull: ["$walletBalance", 0] }, incFields.walletBalance] }]
          };
        }
        if (incFields.siriCoins !== undefined) {
          setFields.siriCoins = {
            $max: [0, { $add: [{ $ifNull: ["$siriCoins", 0] }, incFields.siriCoins] }]
          };
        }
        await User.findByIdAndUpdate(user._id, [ { $set: setFields } ]);
      }
      logger.info(`Successfully reversed purchase rewards and restored credits for order ${orderId}`);
    } catch (err) {
      logger.error(`Failed to reverse rewards for order ${orderId}:`, err);
    }
  }
}
