import mongoose, { Schema, Model } from 'mongoose';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export type InventoryEventType =
  | 'received'
  | 'reserved'
  | 'confirmed'
  | 'released'
  | 'moved_to_production'
  | 'production_completed'
  | 'moved_to_packing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'rental_out'
  | 'rental_returned'
  | 'maintenance_start'
  | 'maintenance_end'
  | 'returned'
  | 'damaged'
  | 'lost'
  | 'quality_hold'
  | 'quality_released'
  | 'adjusted'
  | 'transferred';

export type InventoryState =
  | 'available'
  | 'reserved'
  | 'production'
  | 'packing'
  | 'transit'
  | 'rental'
  | 'maintenance'
  | 'returned'
  | 'damaged'
  | 'lost'
  | 'qualityHold';

export interface IInventoryEvent extends mongoose.Document {
  eventId: string;
  productId: mongoose.Types.ObjectId;
  sku?: string;
  eventType: InventoryEventType;
  fromState?: InventoryState;
  toState: InventoryState;
  quantity: number;
  performedBy: {
    userId?: mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  source: 'scan' | 'api' | 'system' | 'manual_override';
  scanEventId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, index: true },
    eventType: { type: String, required: true, index: true },
    fromState: { type: String },
    toState: { type: String, required: true },
    quantity: { type: Number, required: true },
    performedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    source: {
      type: String,
      enum: ['scan', 'api', 'system', 'manual_override'],
      required: true,
    },
    scanEventId: { type: Schema.Types.ObjectId, ref: 'ScanEvent' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    notes: { type: String },
  },
  {
    timestamps: true,
  },
);

InventoryEventSchema.index({ productId: 1, createdAt: -1 });

// Event sourcing models MUST be append-only, NO soft deletes allowed.
InventoryEventSchema.plugin(ForensicAuditPlugin);

const InventoryEvent = mongoose.model<IInventoryEvent, Model<IInventoryEvent>>(
  'InventoryEvent',
  InventoryEventSchema,
);

export default InventoryEvent;
