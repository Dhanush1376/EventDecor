import mongoose, { Schema, Document } from 'mongoose';

export interface ITrackingEvent {
  status:
    | 'PENDING'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPPED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'RETURNED'
    | 'CANCELLED';
  message: string;
  location?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IFulfilment extends Document {
  fulfilmentNumber: string;
  transactionId: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  domain: 'purchase' | 'rental' | 'event' | 'custom';
  status: ITrackingEvent['status'];
  trackingNumber?: string;
  carrier?: string;
  events: ITrackingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const TrackingEventSchema = new Schema(
  {
    status: { type: String, required: true },
    message: { type: String, required: true },
    location: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const FulfilmentSchema = new Schema(
  {
    fulfilmentNumber: { type: String, required: true, unique: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    domain: {
      type: String,
      enum: ['purchase', 'rental', 'event', 'custom'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'RETURNED',
        'CANCELLED',
      ],
      default: 'PENDING',
      index: true,
    },
    trackingNumber: { type: String },
    carrier: { type: String },
    events: [TrackingEventSchema],
  },
  {
    timestamps: true,
  },
);

// Method to append an event immutably
FulfilmentSchema.methods.addEvent = async function (
  status: ITrackingEvent['status'],
  message: string,
  location?: string,
  metadata?: Record<string, any>,
) {
  this.status = status;
  this.events.push({ status, message, location, timestamp: new Date(), metadata });
  return this.save();
};

export const Fulfilment = mongoose.model<IFulfilment>('Fulfilment', FulfilmentSchema);
export default Fulfilment;
