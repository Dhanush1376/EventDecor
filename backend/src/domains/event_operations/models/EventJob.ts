import mongoose, { Schema, Document } from 'mongoose';

export interface IBookingPayment {
  amount: number;
  date: Date;
  transactionId?: string;
  status: 'pending' | 'success' | 'failed';
  note?: string;
}

export interface IBookingChat {
  sender: 'client' | 'admin';
  message: string;
  timestamp: Date;
  attachments?: string[];
}

export interface IBookingAddon {
  name: string;
  price: number;
}

export interface IBookingCustomization {
  themeColor?: string;
  floralPreference?: string;
  lightingPreference?: string;
  stageSize?: string;
  additionalRequests?: string;
}

export interface IAssignedTeam {
  name: string;
  role: string;
  contact?: string;
}

export interface IRentedInventory {
  item: string;
  quantity: number;
  returnStatus: 'pending' | 'returned' | 'damaged';
  notes?: string;
}

export interface IBookingStatusHistory {
  status: string;
  timestamp?: Date;
  note?: string;
  updatedBy?: string;
}

export interface IEventJob extends Document {
  project?: mongoose.Types.ObjectId; // Reference to parent Project
  bookingId?: string;
  user: mongoose.Types.ObjectId;
  eventPackage?: mongoose.Types.ObjectId;
  title: string;
  eventType: string;
  date: Date;
  bookingDateStr?: string;
  normalizedVenueAddress?: string;
  rentalDurationDays?: number;
  timing: {
    start: string;
    end: string;
  };
  setupTiming?: Date;
  pickupTiming?: Date;
  guestCount: number;
  venue: {
    address: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    googleMapsLink?: string;
    isOutdoor: boolean;
  };
  customization?: IBookingCustomization;
  selectedAddons?: IBookingAddon[];
  inspirationImages?: string[];
  pricing: {
    rentalFee: number;
    setupCharges: number;
    transportationCost: number;
    addOnCharges: number;
    depositAmount: number;
    totalPrice: number;
    pendingBalance: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid';
  };
  payments?: IBookingPayment[];
  status:
    | 'inquiry'
    | 'booking'
    | 'advance_payment'
    | 'material_planning'
    | 'production'
    | 'packing'
    | 'dispatch'
    | 'execution'
    | 'final_settlement'
    | 'completed'
    | 'failed'
    | 'refunded'
    | 'cancelled'
    | 'confirmed'
    | 'team_assigned'
    | 'setup_in_progress'
    | 'payment_processing'
    | 'pending_payment'
    | 'draft';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  assignedTeam?: IAssignedTeam[];
  rentedInventory?: IRentedInventory[];
  statusHistory: IBookingStatusHistory[];
  adminNotes?: string;
  clientApproved: boolean;
  idempotencyKey?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingPaymentSchema = new Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  transactionId: { type: String },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  note: { type: String },
});

const BookingAddonSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const BookingCustomizationSchema = new Schema({
  themeColor: { type: String },
  floralPreference: { type: String },
  lightingPreference: { type: String },
  stageSize: { type: String },
  additionalRequests: { type: String },
});

const AssignedTeamSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  contact: { type: String },
});

const RentedInventorySchema = new Schema({
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
  returnStatus: { type: String, enum: ['pending', 'returned', 'damaged'], default: 'pending' },
  notes: { type: String },
});

const EventJobSchema: Schema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    bookingId: { type: String, unique: true, sparse: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventPackage: { type: Schema.Types.ObjectId, ref: 'Event' },
    title: { type: String, required: true },
    eventType: { type: String, required: true },
    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (v: Date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return v >= today;
        },
        message: 'Event date cannot be in the past.',
      },
    },
    bookingDateStr: { type: String },
    rentalDurationDays: { type: Number, default: 1 },
    timing: {
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
    setupTiming: { type: Date },
    pickupTiming: { type: Date },
    guestCount: { type: Number, required: true, min: 1, max: 10000 },
    venue: {
      address: { type: String, required: true },
      name: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      pincode: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      googleMapsLink: { type: String },
      isOutdoor: { type: Boolean, default: false },
    },
    normalizedVenueAddress: { type: String },
    customization: BookingCustomizationSchema,
    selectedAddons: [BookingAddonSchema],
    inspirationImages: [{ type: String }],
    pricing: {
      rentalFee: { type: Number, default: 0 },
      setupCharges: { type: Number, default: 0 },
      transportationCost: { type: Number, default: 0 },
      addOnCharges: { type: Number, default: 0 },
      depositAmount: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
      pendingBalance: { type: Number, default: 0 },
      paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    },
    payments: [BookingPaymentSchema],
    status: {
      type: String,
      enum: [
        'inquiry',
        'booking',
        'advance_payment',
        'material_planning',
        'production',
        'packing',
        'dispatch',
        'execution',
        'final_settlement',
        'completed',
        'failed',
        'refunded',
        'cancelled',
        'confirmed',
        'team_assigned',
        'setup_in_progress',
        'payment_processing',
        'pending_payment',
        'draft',
      ],
      default: 'inquiry',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    assignedTeam: [AssignedTeamSchema],
    rentedInventory: [RentedInventorySchema],
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        updatedBy: { type: String },
      },
    ],
    adminNotes: { type: String },
    clientApproved: { type: Boolean, default: false },
    idempotencyKey: { type: String, unique: true, sparse: true },
    cancellationReason: { type: String },
  },
  { timestamps: true },
);

EventJobSchema.index({ user: 1 });
EventJobSchema.index({ date: 1 });
EventJobSchema.index({ status: 1 });
EventJobSchema.index({ razorpayOrderId: 1 }); // CRITICAL: Fixes O(N) Webhook Scan

// Double Booking Prevention
EventJobSchema.index(
  { bookingDateStr: 1, normalizedVenueAddress: 1 },
  {
    unique: true,
    name: 'unique_booking_venue_date_v2',
    partialFilterExpression: {
      status: {
        $in: [
          'booking',
          'advance_payment',
          'material_planning',
          'production',
          'packing',
          'dispatch',
          'installation',
          'event_day',
        ],
      },
    },
  },
);

EventJobSchema.pre('save', function () {
  const doc = this as unknown as IEventJob;
  if (doc.isModified('date') || !doc.bookingDateStr) {
    if (doc.date) {
      doc.bookingDateStr = new Date(doc.date).toISOString().split('T')[0];
    }
  }
  if (doc.isModified('venue') || !doc.normalizedVenueAddress) {
    if (doc.venue && doc.venue.address) {
      doc.normalizedVenueAddress = doc.venue.address.trim().toLowerCase().replace(/\s+/g, '_');
    } else {
      doc.normalizedVenueAddress = 'tbd';
    }
  }
});

// High-Performance Production Compound Indexes for User and Admin Paginated Pipelines
EventJobSchema.index({ user: 1, createdAt: -1 });
EventJobSchema.index({ status: 1, createdAt: -1 });
EventJobSchema.index({ user: 1, status: 1 });
EventJobSchema.index({ user: 1, date: 1 });
EventJobSchema.index({ date: 1, status: 1 });

import TransactionSyncPlugin from '../../../utils/TransactionSyncPlugin';
import { BaseEntityPlugin } from '../../../utils/BaseEntityPlugin';

EventJobSchema.plugin(TransactionSyncPlugin, {
  domain: 'event',
  statusField: 'status',
  totalField: 'pricing.totalPrice',
  paymentStatusField: 'pricing.paymentStatus',
});

EventJobSchema.plugin(BaseEntityPlugin);

const EventJob = mongoose.model<IEventJob>('EventJob', EventJobSchema);
export default EventJob;
