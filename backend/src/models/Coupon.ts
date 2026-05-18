import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  startDate: Date;
  expiryDate: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  // Advanced Promotion Attributes
  targetType: 'all' | 'products' | 'categories' | 'tiers';
  targetProductIds: mongoose.Types.ObjectId[];
  targetCategories: string[];
  targetUserTiers: string[];
  displayLocations: string[];
  isFeatured: boolean;
  isAutoApply: boolean;
  cashbackPercentage: number;
  cashbackFixed: number;
  stackingRule: 'stackable' | 'exclusive';
  priority: number;
}

const CouponSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Enterprise Promotion Settings
    targetType: { type: String, enum: ['all', 'products', 'categories', 'tiers'], default: 'all' },
    targetProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    targetCategories: [{ type: String }],
    targetUserTiers: [{ type: String }],
    displayLocations: [{ type: String, default: ['checkout'] }],
    isFeatured: { type: Boolean, default: false },
    isAutoApply: { type: Boolean, default: false },
    cashbackPercentage: { type: Number, default: 0 },
    cashbackFixed: { type: Number, default: 0 },
    stackingRule: { type: String, enum: ['stackable', 'exclusive'], default: 'exclusive' },
    priority: { type: Number, default: 1 },
  },
  { timestamps: true }
);

CouponSchema.index({ isActive: 1 });
CouponSchema.index({ expiryDate: 1 });

const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);

export default Coupon;
