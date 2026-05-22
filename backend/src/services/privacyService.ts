import mongoose from 'mongoose';
import User from '../models/User';
import Order from '../models/Order';
import Review from '../models/Review';
import RefreshToken from '../models/RefreshToken';
import UsedRefreshToken from '../models/UsedRefreshToken';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

export class PrivacyService {
  /** GDPR Article 15 — portable export of user-held data. */
  static async exportUserData(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new ApiError(404, 'User not found');

    const [orders, reviews] = await Promise.all([
      Order.find({ user: userId })
        .select('-razorpaySignature')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Review.find({ customer: userId }).sort({ createdAt: -1 }).limit(200).lean(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses,
        wishlist: user.wishlist,
        cart: user.cart,
        notificationPreferences: user.notificationPreferences,
        accountPreferences: user.accountPreferences,
        loyaltyTier: user.loyaltyTier,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      orders,
      reviews,
    };
  }

  /** GDPR Article 17 — right to erasure (anonymize PII; retain order records for legal/tax). */
  static async eraseUserAccount(userId: string, confirmEmail: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.email.toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      throw new ApiError(400, 'Confirmation email does not match account email');
    }

    const anonymizedEmail = `deleted+${userId}@anonymized.siriarts.local`;

    await Order.updateMany(
      { user: userId },
      {
        $set: {
          'shippingAddress.name': 'Deleted User',
          'shippingAddress.email': anonymizedEmail,
          'shippingAddress.phone': '0000000000',
          'shippingAddress.address': '[erased]',
          'shippingAddress.locality': '[erased]',
        },
      }
    );

    await Review.updateMany(
      { customer: userId },
      { $set: { customerName: 'Deleted User', comment: '[content removed per erasure request]' } }
    );

    await Promise.all([
      RefreshToken.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }),
      UsedRefreshToken.deleteMany({ userId: new mongoose.Types.ObjectId(userId) }),
    ]);

    user.name = 'Deleted User';
    user.email = anonymizedEmail;
    user.phone = undefined;
    user.avatar = undefined;
    user.addresses = [];
    user.wishlist = [];
    user.cart = [];
    user.recentlyViewed = [];
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.isVerified = false;
    user.notificationPreferences = { email: false, marketing: false };
    await user.save();

    logger.info(`[GDPR ERASURE] User ${userId} anonymized`);
    return { erased: true, anonymizedEmail };
  }
}
