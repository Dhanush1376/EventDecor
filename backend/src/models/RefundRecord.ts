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

  returnRequestId?: mongoose.Types.ObjectId;
  refundMethod?: 'gateway' | 'wallet' | 'store_credit';
  processingFee?: number;
  shippingRefund?: number;
  taxRefund?: number;
  completedAt?: Date;
  approvalLevel?: string;

  bankReference?: string;
  gatewayResponse?: any;
  gatewayFee?: number;

  refundBreakdown?: {
    productTotal: number;
    taxRefund: number;
    shippingRefund: number;
    couponDeduction: number;
    walletDeduction: number;
  };

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

    returnRequestId: { type: Schema.Types.ObjectId, ref: 'ReturnRequest' },
    refundMethod: { type: String, enum: ['gateway', 'wallet', 'store_credit'], default: 'gateway' },
    processingFee: { type: Number, default: 0 },
    shippingRefund: { type: Number, default: 0 },
    taxRefund: { type: Number, default: 0 },
    completedAt: { type: Date },
    approvalLevel: { type: String },

    bankReference: { type: String },
    gatewayResponse: { type: Schema.Types.Mixed },
    gatewayFee: { type: Number, default: 0 },

    refundBreakdown: {
      productTotal: { type: Number },
      taxRefund: { type: Number },
      shippingRefund: { type: Number },
      couponDeduction: { type: Number },
      walletDeduction: { type: Number },
    },
  },
  { timestamps: true },
);

RefundRecordSchema.index({ status: 1, createdAt: 1 });
RefundRecordSchema.index({ entityType: 1, entityId: 1 });
RefundRecordSchema.index({ originalTransactionId: 1 });
RefundRecordSchema.index({ razorpayRefundId: 1 }, { sparse: true });

export default mongoose.models.RefundRecord ||
  mongoose.model<IRefundRecord>('RefundRecord', RefundRecordSchema);
