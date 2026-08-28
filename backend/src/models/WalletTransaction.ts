import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'credit' | 'debit';
  amount: number;
  source:
    | 'onboarding'
    | 'purchase_cashback'
    | 'review_reward'
    | 'referral_bonus'
    | 'refund'
    | 'checkout_redeem'
    | 'reversal'
    | 'admin_adjustment';
  description: string;
  orderId?: mongoose.Types.ObjectId;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'reversed';
  createdAt: Date;
  updatedAt: Date;
  reviewId?: mongoose.Types.ObjectId;
  returnRequestId?: mongoose.Types.ObjectId;
  balanceBefore?: number;
  balanceAfter?: number;
  adminId?: mongoose.Types.ObjectId;
  ipAddress?: string;
}

const WalletTransactionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    source: {
      type: String,
      enum: [
        'onboarding',
        'purchase_cashback',
        'review_reward',
        'referral_bonus',
        'refund',
        'checkout_redeem',
        'reversal',
        'admin_adjustment',
      ],
      required: true,
    },
    description: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    returnRequestId: { type: Schema.Types.ObjectId, ref: 'ReturnRequest' },
    expiryDate: { type: Date },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    status: {
      type: String,
      enum: ['active', 'expired', 'reversed'],
      default: 'active',
      required: true,
    },
  },
  { timestamps: true },
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ userId: 1, type: 1 });
WalletTransactionSchema.index({ status: 1 });
WalletTransactionSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 });

// Idempotency constraint for review rewards: max 1 reward transaction per review document
WalletTransactionSchema.index(
  { source: 1, reviewId: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'review_reward', reviewId: { $exists: true } },
  },
);

// High-Performance Production Compound Index for User History Feed Pagination
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

// Idempotency constraint for wallet refunds: max 1 refund transaction per return request
WalletTransactionSchema.index(
  { source: 1, returnRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'refund', returnRequestId: { $exists: true } },
  },
);

const WalletTransaction = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  WalletTransactionSchema,
);

export default WalletTransaction;
