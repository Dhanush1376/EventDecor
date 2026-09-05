import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IRentalOrder extends Document {
  rentalOrderId: string;
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity?: number;
  productTitle: string;
  productImage: string;
  rentalStartDate: Date;
  rentalEndDate: Date;
  durationDays: number;
  rentalRate: {
    rentalPrice: number;
    rentalDurationDays: number;
    type?: string;
    rate?: number;
  };
  rentalCharge: number;
  securityDeposit: number;
  deliveryCharge: number;
  tax: number;
  walletDeduction?: number;
  totalAmount: number;
  status:
    | 'pending'
    | 'confirmed'
    | 'active_rental'
    | 'late_return'
    | 'return_requested'
    | 'returned'
    | 'completed'
    | 'cancelled';
  paymentMethod: string;
  paymentStatus:
    | 'pending'
    | 'processing'
    | 'paid'
    | 'partially_paid'
    | 'unpaid'
    | 'failed'
    | 'refunded'
    | 'Pending COD'
    | 'COD Collected';
  shippingAddress: {
    name: string;
    phone: string;
    email: string;
    address: string;
    locality: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  identityDocuments: {
    type: string;
    url: string;
  }[];
  aadhaarNumber: string;
  agreementAcceptedAt: Date;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  statusHistory: {
    status: string;
    note?: string;
    performedBy?: string;
    timestamp: Date;
  }[];
  returnRequestedAt?: Date;
  actualReturnDate?: Date;
  inspectionResult?: {
    condition: string;
    refundAmount: number;
    penaltyAmount: number;
    depositDeduction: number;
    inspectedBy: string;
    notes?: string;
    images?: string[];
    inspectedAt: Date;
  };
  amountPaid: number;
  paymentHistory: {
    amount: number;
    method: string;
    note?: string;
    recordedBy: string;
    date: Date;
  }[];
  depositRefund?: {
    amount: number;
    date: Date;
    reason: string;
    processedBy: string;
    method: string;
    refundId?: string;
    status?: string;
  };
  depositStatus: 'held' | 'refunded' | 'forfeited' | 'processing' | 'not_applicable';
  lateFee: number;
  lateFeeAppliedDays: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RentalOrderSchema: Schema = new Schema(
  {
    rentalOrderId: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, default: 1, min: 1 },
    productTitle: { type: String, required: true },
    productImage: { type: String, required: true },
    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    durationDays: { type: Number, required: true },
    rentalRate: {
      rentalPrice: { type: Number },
      rentalDurationDays: { type: Number },
      type: { type: String },
      rate: { type: Number },
    },
    rentalCharge: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    walletDeduction: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'packed',
        'out_for_delivery',
        'delivered',
        'active_rental',
        'late_return',
        'return_requested',
        'inspecting',
        'returned',
        'completed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    paymentMethod: { type: String, default: 'Razorpay' },
    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'processing',
        'paid',
        'partially_paid',
        'unpaid',
        'failed',
        'refunded',
        'Pending COD',
        'COD Collected',
      ],
      default: 'pending',
      index: true,
    },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
      locality: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true, default: 'India' },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    identityDocuments: [
      {
        type: { type: String },
        url: { type: String },
      },
    ],
    aadhaarNumber: { type: String },
    agreementAcceptedAt: { type: Date },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String },
        performedBy: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    returnRequestedAt: { type: Date },
    actualReturnDate: { type: Date },
    inspectionResult: {
      condition: { type: String },
      refundAmount: { type: Number },
      penaltyAmount: { type: Number },
      depositDeduction: { type: Number },
      inspectedBy: { type: String },
      notes: { type: String },
      images: [{ type: String }],
      inspectedAt: { type: Date },
    },
    amountPaid: { type: Number, default: 0 },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        method: { type: String, required: true },
        note: { type: String },
        recordedBy: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    depositRefund: {
      amount: { type: Number },
      date: { type: Date },
      reason: { type: String },
      processedBy: { type: String },
      method: { type: String },
      refundId: { type: String },
      status: { type: String, enum: ['processing', 'completed', 'failed'] },
    },
    depositStatus: {
      type: String,
      enum: ['held', 'refunded', 'forfeited', 'processing', 'not_applicable'],
      default: 'held',
    },
    lateFee: { type: Number, default: 0 },
    lateFeeAppliedDays: { type: Number, default: 0 },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

// Pre-save hook to generate rentalOrderId with cryptographic randomness
RentalOrderSchema.pre('save', function () {
  const doc = this as any;
  if (!doc.rentalOrderId) {
    const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase();
    doc.rentalOrderId = `RNT-${Date.now().toString(36).toUpperCase()}-${randomChars}`;
  }
});

import TransactionSyncPlugin from '../utils/TransactionSyncPlugin';
RentalOrderSchema.plugin(TransactionSyncPlugin, {
  domain: 'rental',
  statusField: 'status',
  totalField: 'totalAmount',
});

const RentalOrder = mongoose.model<IRentalOrder>('RentalOrder', RentalOrderSchema);
export default RentalOrder;
