import mongoose from 'mongoose';

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
