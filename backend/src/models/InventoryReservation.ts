import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryReservation extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  quantity: number;
  status: 'reserved' | 'confirmed' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryReservationSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['reserved', 'confirmed', 'expired'],
      default: 'reserved',
    },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  },
);

// CRITICAL FIX: Do NOT auto-delete 'reserved' status documents via TTL.
// The sweep CRON must decrement reservedStock BEFORE the document is removed.
// TTL cleanup only applies to already-finalized documents (confirmed/expired) after 24 hours.
InventoryReservationSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 24 * 60 * 60,
    partialFilterExpression: { status: { $in: ['confirmed', 'expired'] } },
  },
);
InventoryReservationSchema.index({ product: 1, status: 1 });
InventoryReservationSchema.index({ user: 1, status: 1 });
InventoryReservationSchema.index({ status: 1, expiresAt: 1 }); // For sweep CRON queries

const InventoryReservation = mongoose.model<IInventoryReservation>(
  'InventoryReservation',
  InventoryReservationSchema,
);
export default InventoryReservation;
