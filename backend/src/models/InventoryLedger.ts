import mongoose, { Schema, Document } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

/**
 * InventoryLedger — Transactional double-entry ledger for inventory.
 *
 * Replaces simple mutable state with an immutable, append-only double-entry ledger.
 *
 * Accounts:
 * - AVAILABLE: Stock ready to be sold/rented
 * - RESERVED: Stock temporarily held for a pending order
 * - SOLD: Stock permanently deducted for a completed order
 * - SUPPLIER: Source of new stock (restocks)
 * - SHRINKAGE: Destination for lost/damaged stock
 */

export interface IInventoryLedger extends ISoftDeleted {
  product: mongoose.Types.ObjectId;
  referenceId: string; // OrderId or ReservationId
  referenceType: 'Order' | 'RentalOrder' | 'EventBooking' | 'Manual';
  type: 'reservation' | 'confirmation' | 'cancellation' | 'restock' | 'shrinkage' | 'refund';
  quantity: number;
  fromAccount: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'SUPPLIER' | 'SHRINKAGE';
  toAccount: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'SUPPLIER' | 'SHRINKAGE';
  status: 'committed' | 'rolled_back';
  performedBy: string;
  notes?: string;
  createdAt: Date;
}

const InventoryLedgerSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    referenceId: { type: String, required: true, index: true },
    referenceType: { type: String, required: true },
    type: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    fromAccount: { type: String, required: true },
    toAccount: { type: String, required: true },
    status: { type: String, enum: ['committed', 'rolled_back'], default: 'committed' },
    performedBy: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

// Indexes for fast aggregation of balances
InventoryLedgerSchema.index({ product: 1, toAccount: 1, status: 1 });
InventoryLedgerSchema.index({ product: 1, fromAccount: 1, status: 1 });

InventoryLedgerSchema.plugin(SoftDeletePlugin);
InventoryLedgerSchema.plugin(ForensicAuditPlugin);

const InventoryLedger = mongoose.model<IInventoryLedger, SoftDeleteModel<IInventoryLedger>>('InventoryLedger', InventoryLedgerSchema);
export default InventoryLedger;
