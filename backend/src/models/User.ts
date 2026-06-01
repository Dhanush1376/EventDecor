import mongoose, { Schema, Document } from 'mongoose';
import { decryptField, encryptField } from '../utils/fieldEncryption';

export interface IUser extends Document {
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
    gender: { type: String, default: '', trim: true },
    dateOfBirth: { type: String, default: '', trim: true },
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product', default: [] }],
    cart: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 },
        variant: { type: String, default: 'Default' },
        type: { type: String, enum: ['purchase', 'rental'], default: 'purchase' },
        rentalInfo: {
          startDate: { type: Date },
          endDate: { type: Date },
        },
      },
    ],
    recentlyViewed: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
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

// High-Performance Production Compound Index for Paginated Staff and Admin Lists
UserSchema.index({ role: 1, createdAt: -1 });

/** S-07: Revoke refresh sessions when a user document is deleted */
async function purgeUserSessions(userId: mongoose.Types.ObjectId) {
  try {
    const RefreshToken = mongoose.model('RefreshToken');
    const UsedRefreshToken = mongoose.model('UsedRefreshToken');
    await Promise.all([
      RefreshToken.deleteMany({ userId }),
      UsedRefreshToken.deleteMany({ userId }),
    ]);
  } catch {
    // Models may not be registered in script contexts
  }
}

UserSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await purgeUserSessions(doc._id);
});

UserSchema.post('deleteOne', { document: true, query: false }, async function (doc: any) {
  if (doc) await purgeUserSessions(doc._id);
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
