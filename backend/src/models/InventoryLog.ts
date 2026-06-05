import mongoose, { Schema, Document } from 'mongoose';

/**
 * InventoryLog — Audit trail for all stock mutations.
 *
 * Every stock change (order, cancellation, manual adjustment, stale-order release)
 * should be recorded here to enable forensic stock reconciliation.
 *
 * Audit Fix: I-01 — No inventory audit trail existed previously.
 */

export interface IInventoryLog extends Document {
  product: mongoose.Types.ObjectId;
  previousStock: number;
  newStock: number;
  delta: number;
  reason:
    | 'order_placed'
    | 'order_cancelled'
    | 'payment_failed'
    | 'stale_release'
    | 'manual_adjustment'
    | 'return'
    | 'restock'
    | 'rental_placed'
    | 'booking_placed';
  orderId?: mongoose.Types.ObjectId;
  referenceType?: 'Order' | 'RentalOrder' | 'EventBooking';
  performedBy?: string;
  note?: string;
  createdAt: Date;
}

const InventoryLogSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      required: true,
      enum: [
        'order_placed',
        'order_cancelled',
        'payment_failed',
        'stale_release',
        'manual_adjustment',
        'return',
        'restock',
        'rental_placed',
        'booking_placed',
      ],
    },
    orderId: { type: Schema.Types.ObjectId }, // Flexible ref based on referenceType
    referenceType: { type: String, enum: ['Order', 'RentalOrder', 'EventBooking'] },
    performedBy: { type: String }, // userId or 'system' for automated jobs
    note: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Query indexes for reconciliation and reporting
InventoryLogSchema.index({ product: 1, createdAt: -1 });
InventoryLogSchema.index({ orderId: 1 });
InventoryLogSchema.index({ reason: 1, createdAt: -1 });

const InventoryLog = mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);
export default InventoryLog;
