import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentWebhookEvent extends Document {
  razorpayEventId: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'dead_letter';
  processingAttempts: number;
  lastAttemptAt?: Date;
  errorLog?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentWebhookEventSchema: Schema = new Schema(
  {
    razorpayEventId: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed', 'dead_letter'],
      default: 'pending',
      index: true,
    },
    processingAttempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    errorLog: { type: String },
  },
  { timestamps: true },
);

// Prevent processing the exact same razorpay event ID multiple times in case Razorpay sends duplicates
PaymentWebhookEventSchema.index({ razorpayEventId: 1 }, { unique: true });
PaymentWebhookEventSchema.index({ status: 1, createdAt: 1 });
PaymentWebhookEventSchema.index({ status: 1, processingAttempts: 1 });

// TTL index to automatically delete processed webhook events older than 90 days (7776000 seconds)
PaymentWebhookEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { status: 'processed' } },
);

export default mongoose.model<IPaymentWebhookEvent>(
  'PaymentWebhookEvent',
  PaymentWebhookEventSchema,
);
