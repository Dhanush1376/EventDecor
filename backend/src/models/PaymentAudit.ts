import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentAudit extends Document {
  orderId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  eventType: 'verification_attempt' | 'webhook_received' | 'refund_attempt';
  status: 'success' | 'failed' | 'tampered' | 'error';
  amountExpected?: number;
  amountReceived?: number;
  currencyReceived?: string;
  signatureValid: boolean;
  notes: string;
  ipAddress?: string;
  rawPayload?: string;
  createdAt: Date;
}

const PaymentAuditSchema: Schema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    eventType: { type: String, required: true, enum: ['verification_attempt', 'webhook_received', 'refund_attempt'] },
    status: { type: String, required: true, enum: ['success', 'failed', 'tampered', 'error'] },
    amountExpected: { type: Number },
    amountReceived: { type: Number },
    currencyReceived: { type: String },
    signatureValid: { type: Boolean, default: false },
    notes: { type: String, required: true },
    ipAddress: { type: String },
    rawPayload: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentAuditSchema.index({ createdAt: -1 });

export default mongoose.model<IPaymentAudit>('PaymentAudit', PaymentAuditSchema);
