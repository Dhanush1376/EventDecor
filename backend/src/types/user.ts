import mongoose from 'mongoose';
import { ISoftDeleted } from '../utils/SoftDeletePlugin';

export interface IUser extends ISoftDeleted {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role:
    | 'user'
    | 'customer'
    | 'owner'
    | 'super_admin'
    | 'main_admin'
    | 'moderator'
    | 'support_admin'
    | 'support'
    | 'order_manager'
    | 'content_manager'
    | 'admin'
    | 'manager'
    | 'coordinator';
  avatar?: string;
  providers: ('otp' | 'google')[];
  googleId?: string;
  gender?: string;
  dateOfBirth?: string;
  wishlist: mongoose.Types.ObjectId[];
  cart: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    variant?: string;
    type?: 'purchase' | 'rental';
    rentalInfo?: {
      startDate: Date;
      endDate: Date;
    };
    customizationNote?: string;
  }>;
  recentlyViewed?: Array<{
    product: mongoose.Types.ObjectId;
    viewedAt: Date;
  }>;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    inApp: boolean;
    push: boolean;
    categories: {
      orderUpdates: boolean;
      promotions: boolean;
      security: boolean;
      newsletter: boolean;
      bookingUpdates: boolean;
      rentalUpdates: boolean;
    };
  };
  accountPreferences?: {
    theme: string;
    language: string;
  };
  isVerified: boolean;
  lastLogin?: Date;
  passwordHash?: string;
  passwordChangedAt?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lockUntil?: Date;
  walletBalance: number;
  siriCoins: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralsCount: number;
  createdAt: Date;
  updatedAt: Date;
}
