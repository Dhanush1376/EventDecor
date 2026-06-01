import mongoose, { Schema, Document } from 'mongoose';

export interface IRentalOrder extends Document {
  rentalOrderId: string;
  user: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productTitle: string;
  productImage: string;
  rentalStartDate: Date;
  rentalEndDate: Date;
  durationDays: number;
  rentalRate: {
    type: string;
    rate: number;
  };
  rentalCharge: number;
  securityDeposit: number;
  deliveryCharge: number;
  tax: number;
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
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'Pending COD' | 'COD Collected';
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
  depositRefund?: {
    amount: number;
    date: Date;
    reason: string;
    processedBy: string;
  };
  lateFee: number;
  lateFeeAppliedDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const RentalOrderSchema: Schema = new Schema(
  {
    rentalOrderId: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productTitle: { type: String, required: true },
    productImage: { type: String, required: true },
    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    durationDays: { type: Number, required: true },
    rentalRate: {
      type: { type: String },
      rate: { type: Number },
    },
    rentalCharge: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'active_rental',
        'late_return',
        'return_requested',
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
      enum: ['pending', 'paid', 'failed', 'refunded', 'Pending COD', 'COD Collected'],
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
    depositRefund: {
      amount: { type: Number },
      date: { type: Date },
      reason: { type: String },
      processedBy: { type: String },
    },
    lateFee: { type: Number, default: 0 },
    lateFeeAppliedDays: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Pre-save hook to generate rentalOrderId
RentalOrderSchema.pre('save', function () {
  const doc = this as any;
  if (!doc.rentalOrderId) {
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    doc.rentalOrderId = `RNT-${Date.now().toString().slice(-4)}-${randomChars}`;
  }
});

const RentalOrder = mongoose.model<IRentalOrder>('RentalOrder', RentalOrderSchema);
export default RentalOrder;
