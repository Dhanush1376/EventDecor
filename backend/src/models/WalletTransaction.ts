import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'credit' | 'debit';
  amount: number;
  source: 'onboarding' | 'purchase_cashback' | 'review_reward' | 'referral_bonus' | 'refund' | 'checkout_redeem' | 'reversal' | 'admin_adjustment';
  description: string;
  orderId?: mongoose.Types.ObjectId;
  expiryDate?: Date;
  status: 'active' | 'expired' | 'reversed';
  createdAt: Date;
  updatedAt: Date;
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
        'admin_adjustment'
      ],
      required: true
    },
    description: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'expired', 'reversed'],
      default: 'active',
      required: true
    }
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1 });
WalletTransactionSchema.index({ status: 1 });
WalletTransactionSchema.index({ source: 1 });
WalletTransactionSchema.index({ createdAt: -1 });

// High-Performance Production Compound Index for User History Feed Pagination
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);

export default WalletTransaction;
