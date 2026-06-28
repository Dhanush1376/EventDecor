import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPaymentAttempt extends Document {
  razorpayOrderId: string;
  userId: mongoose.Types.ObjectId;
  type: 'purchase' | 'rental' | 'event_booking';
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'expired';
  orderData: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentAttemptSchema = new Schema<IPaymentAttempt>(
  {
    razorpayOrderId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['purchase', 'rental', 'event_booking'], required: true },
    status: {
      type: String,
      enum: ['initiated', 'processing', 'success', 'failed', 'expired'],
      default: 'initiated',
    },
    // We use a strictly defined structure where possible for the core payload,
    // but keep it flexible enough for all three order types.
    orderData: { type: Schema.Types.Mixed, required: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: { expires: 0 },
    },
  },
  { timestamps: true },
);

export const PaymentAttempt: Model<IPaymentAttempt> = mongoose.model<IPaymentAttempt>(
  'PaymentAttempt',
  paymentAttemptSchema,
);
export default PaymentAttempt;
