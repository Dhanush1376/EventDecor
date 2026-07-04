import mongoose from 'mongoose';

export interface IPaymentEvent extends mongoose.Document {
  eventId: string;
  orderId: mongoose.Types.ObjectId;
  orderType: 'purchase' | 'rental' | 'custom';
  eventType:
    | 'initiated'
    | 'processing'
    | 'authorized'
    | 'captured'
    | 'paid'
    | 'failed'
    | 'retry_initiated'
    | 'retry_succeeded'
    | 'retry_failed'
    | 'refund_initiated'
    | 'partial_refund'
    | 'full_refund'
    | 'refund_completed'
    | 'refund_failed'
    | 'chargeback'
    | 'dispute_opened'
    | 'dispute_won'
    | 'dispute_lost'
    | 'webhook_received'
    | 'reconciled';
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  gatewayResponse?: any;
  previousEventId?: mongoose.Types.ObjectId;
  performedBy: 'customer' | 'system' | 'admin' | 'razorpay_webhook';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}
