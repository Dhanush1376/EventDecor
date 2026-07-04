import mongoose, { Schema, Model } from 'mongoose';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IOrderEvent } from '../types/orderEvent';

const OrderEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderType: {
      type: String,
      enum: ['purchase', 'rental', 'custom'],
      required: true,
    },
    eventType: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    performedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    source: {
      type: String,
      enum: ['system', 'admin', 'warehouse', 'courier', 'customer'],
      required: true,
    },
    location: {
      warehouseId: { type: String },
      city: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    metadata: { type: Schema.Types.Mixed },
    photos: [{ type: String }],
    previousEventId: { type: Schema.Types.ObjectId, ref: 'OrderEvent' },
    signature: { type: String, required: true },
    isValid: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  },
);

OrderEventSchema.index({ orderId: 1, timestamp: -1 });

// Event sourcing models MUST be append-only, NO soft deletes allowed.
OrderEventSchema.plugin(ForensicAuditPlugin);

const OrderEvent = mongoose.model<IOrderEvent, Model<IOrderEvent>>('OrderEvent', OrderEventSchema);

export default OrderEvent;
