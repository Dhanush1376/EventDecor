import mongoose, { Schema } from 'mongoose';
import { IPaymentEvent } from '../types/payment';

const PaymentEventSchema = new Schema<IPaymentEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderType: { type: String, enum: ['purchase', 'rental', 'custom'], required: true },
    eventType: {
      type: String,
      enum: [
        'initiated',
        'processing',
        'authorized',
        'captured',
        'paid',
        'failed',
        'retry_initiated',
        'retry_succeeded',
        'retry_failed',
        'refund_initiated',
        'partial_refund',
        'full_refund',
        'refund_completed',
        'refund_failed',
        'chargeback',
        'dispute_opened',
        'dispute_won',
        'dispute_lost',
        'webhook_received',
        'reconciled',
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    gatewayResponse: { type: Schema.Types.Mixed },
    previousEventId: { type: Schema.Types.ObjectId, ref: 'PaymentEvent' },
    performedBy: {
      type: String,
      enum: ['customer', 'system', 'admin', 'razorpay_webhook'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

PaymentEventSchema.index({ eventId: 1 }, { unique: true });
PaymentEventSchema.index({ orderId: 1, timestamp: 1 });
PaymentEventSchema.index({ razorpayOrderId: 1 });
PaymentEventSchema.index({ razorpayPaymentId: 1 });

// Note: To find the "current" payment status of an order, we query the latest PaymentEvent for that orderId.
export default mongoose.models.PaymentEvent ||
  mongoose.model<IPaymentEvent>('PaymentEvent', PaymentEventSchema);
