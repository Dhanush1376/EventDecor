import mongoose from 'mongoose';
import Coupon from '../models/Coupon';

/**
 * Atomically records one redemption of a coupon by a user.
 *
 * The update only matches while the coupon is active, unexpired, under its usage limit and not
 * yet used by this user, so concurrent checkouts cannot over-redeem it. Returns the updated
 * coupon, or null when the redemption was refused.
 */
export const claimCouponUsage = (
  code: string,
  userId: string,
  orderId: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession,
) =>
  Coupon.findOneAndUpdate(
    {
      code: code.toUpperCase().trim(),
      isActive: true,
      expiryDate: { $gte: new Date() },
      'usedBy.userId': { $ne: new mongoose.Types.ObjectId(String(userId)) },
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { usageLimit: 0 },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    },
    {
      $inc: { usedCount: 1 },
      $push: { usedBy: { userId, orderId } },
    },
    { session: session || null, returnDocument: 'after' },
  );

/** Whether this user has already redeemed the coupon. */
export const hasUserUsedCoupon = (coupon: { usedBy?: { userId: any }[] }, userId: string) =>
  Boolean(coupon.usedBy?.some((u) => String(u.userId) === String(userId)));
