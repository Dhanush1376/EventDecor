import mongoose, { Schema, Document } from 'mongoose';

/**
 * RentalDayBlock — Native MongoDB collision prevention for rental bookings.
 *
 * By storing each booked day individually and using a unique compound index,
 * we prevent overlapping bookings natively at the database level, completely
 * eliminating the possibility of race conditions (even if Redis locks fail or
 * phantom reads occur in transactions).
 */

export interface IRentalDayBlock extends Document {
  product: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format
  unitNumber: number; // 1 to product.rentalStock
  rentalOrder: mongoose.Types.ObjectId;
}

const RentalDayBlockSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    date: { type: String, required: true },
    unitNumber: { type: Number, required: true },
    rentalOrder: { type: Schema.Types.ObjectId, ref: 'RentalOrder', required: true },
  },
  { timestamps: true },
);

// NATIVE COLLISION PREVENTION
// No two orders can book the same product unit on the same day.
RentalDayBlockSchema.index({ product: 1, date: 1, unitNumber: 1 }, { unique: true });
RentalDayBlockSchema.index({ rentalOrder: 1 });

const RentalDayBlock = mongoose.model<IRentalDayBlock>('RentalDayBlock', RentalDayBlockSchema);
export default RentalDayBlock;
