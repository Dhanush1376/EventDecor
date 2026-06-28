import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../utils/SoftDeletePlugin';

import { IOrder } from '../types/order';

const OrderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
          title: { type: String, required: true },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true },
          variant: { type: String },
          imageSrc: { type: String, required: true },
          category: { type: String },
          isNonRefundable: { type: Boolean, default: false },
          customizationNote: { type: String, trim: true, maxlength: 2000 },
        },
      ],
      validate: [(val: any[]) => val.length <= 50, '{PATH} exceeds the limit of 50 items'],
    },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      alternatePhone: { type: String },
      email: { type: String, required: true },
      pincode: { type: String, required: true },
      locality: { type: String, required: true },
      address: { type: String, required: true },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, default: 'India', required: true },
      type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
      deliveryInstructions: { type: String },
    },
    paymentMethod: { type: String, default: 'Razorpay' },
    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'processing',
        'authorized',
        'captured',
        'paid',
        'failed',
        'Pending COD',
        'COD Collected',
        'refunded',
        'partially_refunded',
        'chargeback',
        'disputed',
        'dispute_open',
        'dispute_won',
        'dispute_lost',
      ],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: [
        'Payment Pending',
        'Pending',
        'Confirmed',
        'Packed',
        'Ready to Ship',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Returned',
        'Refunded',
        'Settled',
      ],
      default: 'Pending',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        performedBy: { type: String },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    codFee: { type: Number, default: 0, min: 0 },
    walletDeduction: { type: Number, default: 0, min: 0 },
    coinsEarned: { type: Number, default: 0, min: 0 },
    cashbackEarned: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    razorpaySignature: { type: String },
    invoiceNumber: { type: String, unique: true, sparse: true },
    trackingNumber: { type: String },
    courierPartner: { type: String },
    weight: { type: Number, default: 0 },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    packageType: { type: String, default: 'Standard Box' },
    barcodeData: { type: String },
    qrCodeData: { type: String },
    notes: { type: String },
    needByDate: { type: String },
    idempotencyKey: { type: String, unique: true, sparse: true },
    publicTrackingToken: { type: String, select: false },
    codCollected: { type: Boolean, default: false },
    settlementStatus: {
      type: String,
      enum: ['Pending', 'Settled', 'Not Applicable'],
      default: 'Not Applicable',
    },
    settledAmount: { type: Number, default: 0 },
    courierCharges: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    reservationIds: [{ type: Schema.Types.ObjectId, ref: 'InventoryReservation' }],
    returnRequestIds: [{ type: Schema.Types.ObjectId, ref: 'ReturnRequest' }],
    refundStatus: { type: String, enum: ['none', 'partial', 'full'], default: 'none' },
    hasActiveReturn: { type: Boolean, default: false },
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1 });
OrderSchema.index({ trackingNumber: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, orderStatus: 1, createdAt: 1 });
OrderSchema.index({ user: 1, orderStatus: 1 });
OrderSchema.index({ user: 1, paymentStatus: 1, createdAt: -1 });

// Compound index for Razorpay webhook payment verification (hot path — prevents full collection scan)
OrderSchema.index({ razorpayOrderId: 1, paymentStatus: 1 });
OrderSchema.index({ user: 1, createdAt: -1 });

OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, razorpayOrderId: 1, createdAt: -1 });

OrderSchema.plugin(SoftDeletePlugin);

import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';
OrderSchema.plugin(ForensicAuditPlugin);

const Order = mongoose.model<IOrder, SoftDeleteModel<IOrder>>('Order', OrderSchema);
export default Order;
