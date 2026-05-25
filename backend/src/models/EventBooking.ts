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

export interface IEventBooking extends Document {
  bookingId?: string;
  user: mongoose.Types.ObjectId;
  eventPackage?: mongoose.Types.ObjectId;
  title: string;
  eventType: string;
  date: Date;
  bookingDateStr?: string;
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
    | 'draft'
    | 'pending_payment'
    | 'payment_processing'
    | 'confirmed'
    | 'cancelled'
    | 'refunded'
    | 'failed'
    | 'completed'
    | 'team_assigned'
    | 'setup_in_progress';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  assignedTeam?: IAssignedTeam[];
  rentedInventory?: IRentedInventory[];
  adminNotes?: string;
  clientApproved: boolean;
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

const EventBookingSchema: Schema = new Schema(
  {
    bookingId: { type: String, unique: true, sparse: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventPackage: { type: Schema.Types.ObjectId, ref: 'Event' },
    title: { type: String, required: true },
    eventType: { type: String, required: true },
    date: { type: Date, required: true },
    bookingDateStr: { type: String },
    rentalDurationDays: { type: Number, default: 1 },
    timing: {
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
    setupTiming: { type: Date },
    pickupTiming: { type: Date },
    guestCount: { type: Number, required: true },
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
        'draft',
        'pending_payment',
        'payment_processing',
        'confirmed',
        'cancelled',
        'refunded',
        'failed',
        'completed',
        'team_assigned',
        'setup_in_progress'
      ],
      default: 'draft',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    assignedTeam: [AssignedTeamSchema],
    rentedInventory: [RentedInventorySchema],
    adminNotes: { type: String },
    clientApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

EventBookingSchema.index({ user: 1 });
EventBookingSchema.index({ date: 1 });
EventBookingSchema.index({ status: 1 });

// Double Booking Prevention
EventBookingSchema.index(
  { bookingDateStr: 1, 'venue.address': 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      status: { $in: ['confirmed', 'payment_processing', 'setup_in_progress'] } 
    }
  }
);

EventBookingSchema.pre('save', function () {
  const doc = this as unknown as IEventBooking;
  if (doc.isModified('date') || !doc.bookingDateStr) {
    if (doc.date) {
      doc.bookingDateStr = new Date(doc.date).toISOString().split('T')[0];
    }
  }
});

// High-Performance Production Compound Indexes for User and Admin Paginated Pipelines
EventBookingSchema.index({ user: 1, createdAt: -1 });
EventBookingSchema.index({ status: 1, createdAt: -1 });
EventBookingSchema.index({ user: 1, status: 1 });
EventBookingSchema.index({ user: 1, date: 1 });

const EventBooking = mongoose.model<IEventBooking>('EventBooking', EventBookingSchema);
export default EventBooking;
