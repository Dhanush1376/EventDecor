import mongoose, { Schema, Document } from 'mongoose';

export interface IRefundRecord extends Document {
  amount: number;
  currency: string;
  originalTransactionId: string;
  entityType: 'Order' | 'Rental' | 'EventBooking';
  entityId: mongoose.Types.ObjectId;
  status: 'pending_approval' | 'pending' | 'processing' | 'completed' | 'failed';
  razorpayRefundId?: string;
  retryCount: number;
  errorDetails?: string;
  isPartial: boolean;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefundRecordSchema: Schema = new Schema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    originalTransactionId: { type: String, required: true },
    entityType: { type: String, enum: ['Order', 'Rental', 'EventBooking'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ['pending_approval', 'pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    razorpayRefundId: { type: String },
    retryCount: { type: Number, default: 0 },
    errorDetails: { type: String },
    isPartial: { type: Boolean, default: false },
    reason: { type: String },
  },
  { timestamps: true },
);

RefundRecordSchema.index({ status: 1, createdAt: 1 });
RefundRecordSchema.index({ entityType: 1, entityId: 1 });
RefundRecordSchema.index({ originalTransactionId: 1 });
RefundRecordSchema.index({ razorpayRefundId: 1 }, { sparse: true });

export default mongoose.models.RefundRecord ||
  mongoose.model<IRefundRecord>('RefundRecord', RefundRecordSchema);
