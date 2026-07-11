import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IReservation extends IBaseEntity {
  resourceId: mongoose.Types.ObjectId; // Generic ref to Crew, Vehicle, or EventResource
  resourceType: 'EventCrew' | 'Vehicle' | 'EventResource' | 'Venue';
  eventJobId: mongoose.Types.ObjectId; // Ref to EventJob
  startDate: Date;
  endDate: Date;
  timeSlotId?: mongoose.Types.ObjectId; // Ref to TimeSlot
  status: 'reserved' | 'checked_out' | 'returned' | 'cancelled';
  quantity?: number; // Mostly for EventResource (e.g., 50 chairs)
  notes?: string;
}

const ReservationSchema = new Schema(
  {
    resourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    resourceType: {
      type: String,
      enum: ['EventCrew', 'Vehicle', 'EventResource', 'Venue'],
      required: true,
      index: true,
    },
    eventJobId: { type: Schema.Types.ObjectId, ref: 'EventJob', required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    timeSlotId: { type: Schema.Types.ObjectId, ref: 'TimeSlot' },
    status: {
      type: String,
      enum: ['reserved', 'checked_out', 'returned', 'cancelled'],
      default: 'reserved',
      index: true,
    },
    quantity: { type: Number, default: 1 },
    notes: { type: String },
  },
  { timestamps: true },
);

// Prevent overlapping reservations for unique resources (like a specific Crew member or Venue)
ReservationSchema.index(
  { resourceId: 1, startDate: 1, endDate: 1 },
  {
    name: 'prevent_overlap_unique_resources',
    partialFilterExpression: {
      resourceType: { $in: ['EventCrew', 'Vehicle', 'Venue'] },
      status: { $in: ['reserved', 'checked_out'] },
    },
  },
);

ReservationSchema.plugin(SoftDeletePlugin);
ReservationSchema.plugin(ForensicAuditPlugin);
ReservationSchema.plugin(BaseEntityPlugin);

const Reservation = mongoose.model<IReservation, SoftDeleteModel<IReservation>>(
  'Reservation',
  ReservationSchema,
);

export default Reservation;
