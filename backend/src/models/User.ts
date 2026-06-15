import mongoose, { Schema } from 'mongoose';
import { decryptField, encryptField } from '../utils/fieldEncryption';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

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
    marketing: boolean;
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

const UserSchema: Schema = new Schema(
  {
    name: { type: String, default: 'Customer', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: [
        'user',
        'customer',
        'owner',
        'super_admin',
        'main_admin',
        'moderator',
        'support_admin',
        'support',
        'order_manager',
        'content_manager',
        'admin',
        'manager',
        'coordinator',
      ],
      default: 'customer',
    },
    avatar: { type: String, default: '' },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say', ''],
      default: '',
      trim: true,
    },
    dateOfBirth: { type: String, default: '', trim: true },
    wishlist: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
      validate: [(val: any[]) => val.length <= 100, '{PATH} exceeds the limit of 100 items'],
    },
    cart: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: 'Product' },
          quantity: { type: Number, default: 1 },
          variant: { type: String, default: 'Default' },
          type: { type: String, enum: ['purchase', 'rental'], default: 'purchase' },
          rentalInfo: {
            startDate: { type: Date },
            endDate: { type: Date },
          },
          customizationNote: { type: String, trim: true, maxlength: 2000 },
        },
      ],
      validate: [(val: any[]) => val.length <= 50, '{PATH} exceeds the limit of 50 items'],
    },
    recentlyViewed: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: 'Product' },
          viewedAt: { type: Date, default: Date.now },
        },
      ],
      validate: [(val: any[]) => val.length <= 50, '{PATH} exceeds the limit of 50 items'],
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      marketing: { type: Boolean, default: true },
    },
    accountPreferences: {
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' },
    },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    passwordHash: { type: String, select: false },
    passwordChangedAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false, select: false },
    twoFactorSecret: {
      type: String,
      select: false,
      set: (value: string | undefined) => {
        if (!value) return value;
        return encryptField(value);
      },
      get: (value: string | undefined) => {
        if (!value) return value;
        return decryptField(value);
      },
    },
    failedLoginAttempts: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    lockUntil: { type: Date },
    walletBalance: { type: Number, default: 0 },
    siriCoins: { type: Number, default: 0 },
    loyaltyTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    referralsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

UserSchema.index({ role: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ 'recentlyViewed.product': 1 });
UserSchema.index({ loyaltyTier: 1 });
UserSchema.index({ phone: 1 });

// High-Performance Production Compound Index for Paginated Staff and Admin Lists
UserSchema.index({ role: 1, createdAt: -1 });

/** S-07: Revoke refresh sessions when a user document is deleted */
async function purgeUserSessions(userId: mongoose.Types.ObjectId) {
  try {
    const RefreshToken = mongoose.model('RefreshToken');
    const UsedRefreshToken = mongoose.model('UsedRefreshToken');
    await Promise.all([
      RefreshToken.deleteMany({ userId }, { bypassDestructionGuard: true } as any),
      UsedRefreshToken.deleteMany({ userId }, { bypassDestructionGuard: true } as any),
    ]);
  } catch {
    // Models may not be registered in script contexts
  }
}

UserSchema.pre('save', async function () {
  if (this.isModified('isDeleted') && (this as any).isDeleted) {
    await purgeUserSessions(this._id as mongoose.Types.ObjectId);
  }
});

UserSchema.plugin(SoftDeletePlugin);
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';
UserSchema.plugin(ForensicAuditPlugin);

const User = mongoose.model<IUser, SoftDeleteModel<IUser>>('User', UserSchema);

export default User;
