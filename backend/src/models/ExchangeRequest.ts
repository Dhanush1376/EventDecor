import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export interface IExchangeRequest extends ISoftDeleted {
  exchangeId: string;
  returnRequestId: mongoose.Types.ObjectId;

  originalItem: {
    productId: mongoose.Types.ObjectId;
    title: string;
    variant?: string;
    quantity: number;
    unitPrice: number;
    imageSrc?: string;
  };

  replacementItem: {
    productId: mongoose.Types.ObjectId;
    title: string;
    variant?: string;
    quantity: number;
    unitPrice: number;
    imageSrc?: string;
    reservationId?: mongoose.Types.ObjectId;
  };

  exchangeType: 'size' | 'color' | 'variant' | 'different_product';

  priceDifference: number;
  differenceAction: 'collect_payment' | 'refund_difference' | 'direct_exchange';
  paymentStatus: 'payment_required' | 'payment_paid' | 'failed' | 'not_applicable';
  additionalPaymentId?: string;
  additionalRefundId?: mongoose.Types.ObjectId;

  exchangeOrderId?: mongoose.Types.ObjectId;
  inspectionStatus: 'pending' | 'passed' | 'failed';

  replacementStatus:
    | 'pending_stock'
    | 'reserved'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'inspection_pending'
    | 'inspection_passed';
  trackingNumber?: string;
  courierPartner?: string;

  timeline: {
    action: string;
    timestamp: Date;
    performedBy?: mongoose.Types.ObjectId;
  }[];

  suggestedAlternatives: {
    productId: mongoose.Types.ObjectId;
    title: string;
    price: number;
    imageSrc?: string;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const ExchangeRequestSchema = new Schema<IExchangeRequest>(
  {
    exchangeId: { type: String, required: true, unique: true, index: true },
    returnRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'ReturnRequest',
      required: true,
      index: true,
    },

    originalItem: {
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      title: { type: String, required: true },
      variant: { type: String },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      imageSrc: { type: String },
    },

    replacementItem: {
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      title: { type: String, required: true },
      variant: { type: String },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      imageSrc: { type: String },
      reservationId: { type: Schema.Types.ObjectId, ref: 'InventoryReservation' },
    },

    exchangeType: {
      type: String,
      enum: ['size', 'color', 'variant', 'different_product'],
      required: true,
    },

    priceDifference: { type: Number, default: 0 },
    differenceAction: {
      type: String,
      enum: ['collect_payment', 'refund_difference', 'direct_exchange'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['payment_required', 'payment_paid', 'failed', 'not_applicable'],
      default: 'not_applicable',
    },
    additionalPaymentId: { type: String },
    additionalRefundId: { type: Schema.Types.ObjectId, ref: 'RefundRecord' },

    exchangeOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    inspectionStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed'],
      default: 'pending',
    },

    replacementStatus: {
      type: String,
      enum: [
        'pending_stock',
        'reserved',
        'shipped',
        'delivered',
        'cancelled',
        'inspection_pending',
        'inspection_passed',
      ],
      default: 'pending_stock',
    },
    trackingNumber: { type: String },
    courierPartner: { type: String },

    timeline: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    suggestedAlternatives: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        title: { type: String },
        price: { type: Number },
        imageSrc: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  },
);

ExchangeRequestSchema.plugin(SoftDeletePlugin);
ExchangeRequestSchema.plugin(ForensicAuditPlugin);

const ExchangeRequest = mongoose.model<IExchangeRequest, SoftDeleteModel<IExchangeRequest>>(
  'ExchangeRequest',
  ExchangeRequestSchema,
);

export default ExchangeRequest;
