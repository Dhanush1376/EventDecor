import mongoose, { Schema, Document } from 'mongoose';

/**
 * RentalCalendar — Availability blocking for rental products.
 *
 * Each document represents a date range during which a product is unavailable
 * for rental. A compound index prevents overlapping active bookings for the
 * same product.
 */

export interface IRentalCalendar extends Document {
  product: mongoose.Types.ObjectId;
  rentalOrder: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'booked' | 'returned' | 'cancelled';
  createdAt: Date;
}

const RentalCalendarSchema: Schema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    rentalOrder: { type: Schema.Types.ObjectId, ref: 'RentalOrder', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['booked', 'returned', 'cancelled'],
      default: 'booked',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Indexes for availability queries
RentalCalendarSchema.index({ product: 1, startDate: 1, endDate: 1 });
RentalCalendarSchema.index({ product: 1, status: 1 });
RentalCalendarSchema.index({ rentalOrder: 1 });
RentalCalendarSchema.index({ product: 1, status: 1, startDate: 1, endDate: 1 });

const RentalCalendar = mongoose.model<IRentalCalendar>('RentalCalendar', RentalCalendarSchema);
export default RentalCalendar;
