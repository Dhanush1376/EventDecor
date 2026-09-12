import mongoose from 'mongoose';
import User from '../models/User';
import WalletTransaction from '../models/WalletTransaction';
import Order from '../models/Order';
import Coupon from '../models/Coupon';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { saveUniqueReferralCode } from '../utils/referralCode';
import storeSettingsService from './StoreSettingsService';

export class LoyaltyService {
  /**
   * Computes all loyalty dashboard metrics including aggregations
   */
  static async getDashboardData(userId: string, skip: number = 0, limit: number = 20) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.referralCode) {
      user.referralCode = await saveUniqueReferralCode(user._id, user.name);
    }

    const [transactions, totalTransactions] = await Promise.all([
      WalletTransaction.find({ userId })
        .populate('orderId', 'invoiceNumber total')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments({ userId }),
    ]);

    const activeCoupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gt: new Date() },
    }).lean();

    const spendAggregation = await Order.aggregate([
      { $match: { user: user._id, orderStatus: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, totalSpend: { $sum: '$total' } } },
    ]);
    const lifetimeSpend = spendAggregation[0]?.totalSpend || 0;

    const settings = await storeSettingsService.getSettings();
    const loyaltyTiers = settings.loyalty.tiers || [];
    const currentTierIndex = loyaltyTiers.findIndex((t: any) => t.name === user.loyaltyTier);
    const nextTierObj = loyaltyTiers[currentTierIndex + 1];

    let nextTier: string;
    let spendRequired: number;
    let progressPercentage: number;

    if (nextTierObj) {
      nextTier = nextTierObj.name;
      spendRequired = Math.max(0, nextTierObj.minSpend - lifetimeSpend);
      const currentTierSpend = currentTierIndex >= 0 ? loyaltyTiers[currentTierIndex].minSpend : 0;
      const tierRange = nextTierObj.minSpend - currentTierSpend;
      const currentProgress = lifetimeSpend - currentTierSpend;
      progressPercentage =
        tierRange > 0
          ? Math.max(0, Math.min(100, Math.round((currentProgress / tierRange) * 100)))
          : 100;
    } else {
      nextTier = 'None (Max Tier reached)';
      spendRequired = 0;
      progressPercentage = 100;
    }

    return {
      walletBalance: user.walletBalance || 0,
      siriCoins: user.siriCoins || 0,
      loyaltyTier: user.loyaltyTier || settings.loyalty.tiers?.[0]?.name || 'Bronze',
      referralCode: user.referralCode,
      referralsCount: user.referralsCount || 0,
      lifetimeSpend,
      nextTier,
      spendRequired,
      progressPercentage,
      transactions,
      totalTransactions,
      coupons: activeCoupons,
    };
  }
  /**
   * Welcomes a newly registered user with onboarding credits and generates their referral code
   */
  static async setupNewUserRewards(userId: string, retryCount = 0): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return;
      }

      const settings = await storeSettingsService.getSettings();

      const welcomeCash = settings.loyalty.welcomeBonusEnabled ? settings.loyalty.welcomeBonus : 0;
      const updateQuery: Record<string, unknown> = {};
      if (welcomeCash > 0) {
        updateQuery.$inc = { walletBalance: welcomeCash };
      }

      const setFields: Record<string, string> = {};
      if (!user.referralCode) {
        setFields.referralCode = await saveUniqueReferralCode(user._id, user.name, session);
      }
      if (!user.loyaltyTier) {
        setFields.loyaltyTier = settings.loyalty.tiers?.[0]?.name || 'Bronze';
      }
      if (Object.keys(setFields).length > 0) {
        updateQuery.$set = setFields;
      }

      if (Object.keys(updateQuery).length > 0) {
        await User.findByIdAndUpdate(userId, updateQuery, { session });
      }

      if (welcomeCash > 0) {
        await WalletTransaction.create(
          [
            {
              userId,
              type: 'credit',
              amount: welcomeCash,
              source: 'onboarding',
              description: `Welcome Bonus: ₹${welcomeCash} Siri Cash credited to your loyalty wallet!`,
              status: 'active',
            },
          ],
          { session },
        );
      }

      const crypto = require('crypto');
      const code = `WELCOME-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await Coupon.create(
        [
          {
            code,
            discountType: 'percentage',
            discountValue: settings.loyalty.welcomeCouponDiscount,
            minOrderAmount: settings.loyalty.welcomeCouponMinOrder,
            maxDiscount: settings.loyalty.welcomeCouponMaxDiscount,
            startDate: new Date(),
            expiryDate: new Date(
              Date.now() + (settings.loyalty.welcomeCouponExpiryDays || 30) * 24 * 60 * 60 * 1000,
            ),
            usageLimit: 1,
            usedCount: 0,
            isActive: true,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      logger.info(`Loyalty Welcome Setup successful for user: ${userId}`);
    } catch (err: any) {
      await session.abortTransaction();
      if (err.code === 11000 && retryCount < 3) {
        logger.warn(`Duplicate coupon code generated for ${userId}, retrying...`);
        return this.setupNewUserRewards(userId, retryCount + 1);
      }
      logger.error('Failed to setup welcome onboarding rewards:', err);
    } finally {
      session.endSession();
    }
  }

  /**
   * Apply a referral code at signup — wallet credit and ledger row in one transaction.
   */
  static async applyReferralCode(userId: string, referralCode: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new ApiError(404, 'User session not found');
    if (user.referredBy) throw new ApiError(400, 'You have already applied a referral code');

    const cleanCode = referralCode.trim().toUpperCase();
    if (user.referralCode === cleanCode) {
      throw new ApiError(400, "Self-referral is forbidden. Please enter a friend's referral code.");
    }

    const referrer = await User.findOne({ referralCode: cleanCode }).lean();
    if (!referrer) {
      throw new ApiError(404, 'Invalid referral code. Please check and try again.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const settings = await storeSettingsService.getSettings();

      if (!settings.loyalty.referralProgramEnabled) {
        throw new ApiError(400, 'Referral program is currently disabled');
      }

      const refereeBonus = settings.loyalty.referralBonusReferee;

      await User.findByIdAndUpdate(
        userId,
        { $set: { referredBy: referrer._id }, $inc: { walletBalance: refereeBonus } },
        { session },
      );

      await WalletTransaction.create(
        [
          {
            userId,
            type: 'credit',
            amount: refereeBonus,
            source: 'referral_bonus',
            description: `Applied referral code of ${referrer.name || 'Friend'} - Welcomed with Siri Cash!`,
            status: 'active',
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return { referredBy: referrer.name };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process and apply purchase rewards (Cashback, Siri Coins, Tier upgrades) upon checkout completion
   * Strictly guarded against multiple executions and uncontrolled wallet payouts.
   */
  static async processPurchaseRewards(userId: string, orderId: string, totalSpend: number) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      const order = await Order.findById(orderId).session(session);
      if (!user || !order) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // 0. Strict Idempotency: Has this order already been rewarded?
      if (order.rewardsProcessed) {
        logger.info(`[LOYALTY] Purchase rewards already processed for order ${orderId}, skipping.`);
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const existingCashbackTx = await WalletTransaction.findOne({
        source: 'purchase_cashback',
        orderId: order._id,
      }).session(session);

      if (existingCashbackTx) {
        logger.info(
          `[LOYALTY] Cashback transaction already exists for order ${orderId}, marking processed and skipping.`,
        );
        order.rewardsProcessed = true;
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        return;
      }

      const settings = await storeSettingsService.getSettings();

      // 1. Calculate Siri Coins points earned (reward points, NOT cash currency)
      const coinsPerRupee = Number(settings.loyalty?.coinsPerRupee) || 0;
      const coinsEarned = coinsPerRupee > 0 ? Math.round(order.subtotal * coinsPerRupee) : 0;

      // 2. Cashback into Wallet:
      // STRICT FINANCIAL GUARD: Do NOT arbitrarily give away money on order status updates.
      // Only award cashback if wallet is explicitly enabled AND the user's tier has a designated rate > 0.
      let cashbackEarned = 0;
      const isWalletEnabled = Boolean(settings.loyalty?.walletEnabled);
      if (isWalletEnabled) {
        const tiers = settings.loyalty?.tiers || [];
        const userTier = tiers.find((t: any) => t.name === (user.loyaltyTier || 'Bronze'));
        const tierCashbackRate = Number(userTier?.cashbackRate) || 0;

        if (tierCashbackRate > 0) {
          cashbackEarned = Math.round((order.total || totalSpend) * tierCashbackRate);
          // Hard safety limit at 40 INR per order
          if (cashbackEarned > 40) {
            cashbackEarned = 40;
          }
        }
      }

      // Atomically update User rewards
      const userUpdate: any = {};
      if (coinsEarned > 0) {
        userUpdate.$inc = { ...(userUpdate.$inc || {}), siriCoins: coinsEarned };
      }
      if (cashbackEarned > 0) {
        userUpdate.$inc = { ...(userUpdate.$inc || {}), walletBalance: cashbackEarned };
      }

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(userId, userUpdate, { session });
      }

      // 3. Update Order Document for dynamic receipt rendering and idempotency tracking
      order.coinsEarned = coinsEarned;
      order.cashbackEarned = cashbackEarned;
      order.rewardsProcessed = true;
      await order.save({ session });

      // Log Cashback Credit in transaction audit ledger
      if (cashbackEarned > 0) {
        await WalletTransaction.create(
          [
            {
              userId,
              type: 'credit',
              amount: cashbackEarned,
              source: 'purchase_cashback',
              description: `Earned Siri Cashback on order #${order.invoiceNumber || orderId}`,
              orderId: order._id,
              balanceBefore: user.walletBalance || 0,
              balanceAfter: (user.walletBalance || 0) + cashbackEarned,
              status: 'active',
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();

      // 4. Check for Referral Rewards on Referee's First Purchase (strictly protected against repeat payouts)
      if (
        user.referredBy &&
        !user.referralRewarded &&
        settings.loyalty?.referralProgramEnabled &&
        settings.loyalty?.walletEnabled
      ) {
        const ordersCount = await Order.countDocuments({
          user: userId,
          orderStatus: { $nin: ['Cancelled', 'Refunded'] },
        });
        if (ordersCount === 1) {
          await this.applyReferralBonus(user.referredBy.toString(), userId);
        }
      }

      // 5. Evaluate Membership Tier Upgrades based on Lifetime Valid Purchases
      await this.evaluateTierUpgrades(userId);
    } catch (err) {
      await session.abortTransaction();
      logger.error(`Failed to process purchase rewards for order ${orderId}:`, err);
    } finally {
      session.endSession();
    }
  }

  /**
   * Applies referral bonus to referrer on referee's first purchase completion.
   * Strictly idempotent and single-use per referee.
   */
  static async applyReferralBonus(referrerId: string, refereeId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const referrer = await User.findById(referrerId).session(session);
      const referee = await User.findById(refereeId).session(session);
      if (!referrer || !referee) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // Idempotency: Has this referee already triggered a referral reward?
      if (referee.referralRewarded) {
        logger.info(`[REFERRAL] Referee ${refereeId} already triggered referral reward, skipping.`);
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const existingRefTx = await WalletTransaction.findOne({
        source: 'referral_bonus',
        refereeId: referee._id,
      }).session(session);

      if (existingRefTx) {
        logger.info(
          `[REFERRAL] Referral transaction already exists for referee ${refereeId}, skipping.`,
        );
        referee.referralRewarded = true;
        await referee.save({ session });
        await session.commitTransaction();
        session.endSession();
        return;
      }

      const settings = await storeSettingsService.getSettings();
      if (!settings.loyalty?.referralProgramEnabled || !settings.loyalty?.walletEnabled) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const referrerBonus = Number(settings.loyalty.referralBonusReferrer) || 0;
      if (referrerBonus > 0) {
        const balanceBefore = referrer.walletBalance || 0;
        const balanceAfter = balanceBefore + referrerBonus;

        await User.findByIdAndUpdate(
          referrerId,
          {
            $inc: { walletBalance: referrerBonus, referralsCount: 1 },
          },
          { session },
        );

        await WalletTransaction.create(
          [
            {
              userId: referrerId,
              refereeId: referee._id,
              type: 'credit',
              amount: referrerBonus,
              source: 'referral_bonus',
              description: `Referral Bonus: You referred ${referee.name || 'a friend'}!`,
              balanceBefore,
              balanceAfter,
              status: 'active',
            },
          ],
          { session },
        );
      }

      referee.referralRewarded = true;
      await referee.save({ session });

      await session.commitTransaction();
      logger.info(
        `Referral bonus successfully applied between referrer: ${referrerId} and referee: ${refereeId}`,
      );
    } catch (err) {
      await session.abortTransaction();
      logger.error('Failed to execute referral rewards:', err);
    } finally {
      session.endSession();
    }
  }

  /**
   * Evaluates user's cumulative spent or orders to unlock next Loyalty Tier status
   */
  static async evaluateTierUpgrades(userId: string) {
    try {
      const user = await User.findById(userId).lean();
      if (!user) return;

      // Calculate lifetime purchase spend (excluding cancelled/refunded orders) via DB Aggregation
      const result = await Order.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            orderStatus: { $nin: ['Cancelled', 'Refunded'] },
          },
        },
        { $group: { _id: null, lifetimeSpend: { $sum: '$total' } } },
      ]);
      const lifetimeSpend = result[0]?.lifetimeSpend || 0;

      const settings = await storeSettingsService.getSettings();
      const { getTierBySpend } = require('../constants/loyaltyTiers');
      const newTier = getTierBySpend(lifetimeSpend, settings.loyalty.tiers);

      if (user.loyaltyTier !== newTier) {
        const oldTier = user.loyaltyTier;
        await User.findByIdAndUpdate(userId, { loyaltyTier: newTier });
        logger.info(
          `User ${userId} upgraded loyalty membership tier from ${oldTier} to ${newTier}!`,
        );
      }
    } catch (err) {
      logger.error(`Failed to evaluate tier upgrades for user ${userId}:`, err);
    }
  }

  /**
   * Process rating and review submission credits instantly
   */
  static async processReviewRewards(
    userId: string,
    rating: number,
    hasPhoto: boolean,
    hasVideo: boolean,
    reviewId: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Check existing reward to avoid duplicate processing
      const existingReward = await WalletTransaction.findOne({
        source: 'review_reward',
        reviewId,
      }).session(session);

      if (existingReward) {
        await session.abortTransaction();
        session.endSession();
        return { alreadyRewarded: true, rewardIssued: false };
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return { alreadyRewarded: false, rewardIssued: false };
      }

      const settings = await storeSettingsService.getSettings();

      if (!settings.loyalty.reviewRewardsEnabled) {
        await session.abortTransaction();
        session.endSession();
        return { alreadyRewarded: false, rewardIssued: false };
      }

      // Determine review credits reward
      let rewardAmount = settings.loyalty.reviewRewardText;
      let description = 'Text Review Credit';
      if (hasVideo) {
        rewardAmount = settings.loyalty.reviewRewardVideo;
        description = 'Video Review Gold Credit';
      } else if (hasPhoto) {
        rewardAmount = settings.loyalty.reviewRewardPhoto;
        description = 'Photo Review Silver Credit';
      }

      // 2. CREATE unique transaction claim first (Concurrency protection)
      await WalletTransaction.create(
        [
          {
            userId,
            type: 'credit',
            amount: rewardAmount,
            source: 'review_reward',
            description: `Review Bonus: Earned ₹${rewardAmount} siri cash for submitting ${description}`,
            reviewId,
            status: 'active',
          },
        ],
        { session },
      );

      // 3. CREDIT WALLET
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            walletBalance: rewardAmount,
            siriCoins: settings.loyalty.reviewCoinsBonus,
          },
        },
        { session },
      );

      await session.commitTransaction();
      logger.info(`Instantly rewarded user ${userId} with ₹${rewardAmount} review cash.`);
      return { alreadyRewarded: false, rewardIssued: true, amount: rewardAmount };
    } catch (err: any) {
      await session.abortTransaction();

      // Explicitly check for duplicate key error on the review_reward partial unique index
      if (
        err.code === 11000 &&
        err.keyPattern &&
        err.keyPattern.source &&
        err.keyPattern.reviewId
      ) {
        logger.info(`Duplicate review reward prevented via E11000 for review ${reviewId}`);
        return { alreadyRewarded: true, rewardIssued: false };
      }

      logger.error('Failed to reward review writing:', err);
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reverse cashback and siri coins, and return used wallet amounts if order is cancelled or refunded
   */
  static async reversePurchaseRewards(orderId: string, providedSession?: mongoose.ClientSession) {
    const session = providedSession || (await mongoose.startSession());
    if (!providedSession) session.startTransaction();
    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const user = await User.findById(order.user).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const incFields: any = {};

      // 1. Revoke/Reverse any cashback earned on this order (if not already reversed)
      if (order.cashbackEarned && order.cashbackEarned > 0) {
        const existingReversal = await WalletTransaction.findOne({
          source: 'reversal',
          orderId: order._id,
        }).session(session);

        if (!existingReversal) {
          incFields.walletBalance = (incFields.walletBalance || 0) - order.cashbackEarned;

          await WalletTransaction.create(
            [
              {
                userId: user._id,
                type: 'debit',
                amount: order.cashbackEarned,
                source: 'reversal',
                description: `Revoked earned cashback from cancelled/refunded order #${order.invoiceNumber || orderId}`,
                orderId: order._id,
                status: 'active',
              },
            ],
            { session },
          );
        }
      }

      // 2. Revoke earned Siri Coins
      if (order.coinsEarned && order.coinsEarned > 0) {
        incFields.siriCoins = -order.coinsEarned;
      }

      if (Object.keys(incFields).length > 0) {
        // Use an atomic pipeline update to deduct while clamping the lower bound to 0
        const setFields: any = {};
        if (incFields.walletBalance !== undefined) {
          setFields.walletBalance = {
            $max: [0, { $add: [{ $ifNull: ['$walletBalance', 0] }, incFields.walletBalance] }],
          };
        }
        if (incFields.siriCoins !== undefined) {
          setFields.siriCoins = {
            $max: [0, { $add: [{ $ifNull: ['$siriCoins', 0] }, incFields.siriCoins] }],
          };
        }
        await User.findByIdAndUpdate(user._id, [{ $set: setFields }], { session });
      }

      // Clear earned reward amounts so they cannot be reversed again
      order.cashbackEarned = 0;
      order.coinsEarned = 0;
      await order.save({ session });

      if (!providedSession) await session.commitTransaction();
      logger.info(`Successfully reversed earned rewards for order ${orderId}`);
    } catch (err) {
      if (!providedSession) await session.abortTransaction();
      logger.error(`Failed to reverse rewards for order ${orderId}:`, err);
      if (providedSession) throw err;
    } finally {
      if (!providedSession) session.endSession();
    }
  }

  /**
   * Admin manual adjustment of a user's wallet balance
   */
  static async adjustWalletBalance(
    adminId: string,
    userId: string,
    type: 'credit' | 'debit',
    amount: number,
    description: string,
    ipAddress?: string,
  ) {
    if (amount <= 0) throw new ApiError(400, 'Amount must be greater than 0');

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const balanceBefore = user.walletBalance || 0;
      let balanceAfter = balanceBefore;

      if (type === 'credit') {
        balanceAfter = balanceBefore + amount;
      } else {
        if (balanceBefore < amount) {
          throw new ApiError(
            400,
            `Insufficient wallet balance. Current balance is ₹${balanceBefore}`,
          );
        }
        balanceAfter = balanceBefore - amount;
      }

      await User.findByIdAndUpdate(userId, { walletBalance: balanceAfter }, { session });

      const transaction = await WalletTransaction.create(
        [
          {
            userId,
            type,
            amount,
            source: 'admin_adjustment',
            description,
            status: 'active',
            balanceBefore,
            balanceAfter,
            adminId,
            ipAddress,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      logger.info(
        `Admin ${adminId} ${type}ed ₹${amount} for user ${userId}. Reason: ${description}`,
      );
      return transaction[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
