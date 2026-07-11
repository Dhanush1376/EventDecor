import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface ITimeSlot extends IBaseEntity {
  name: string; // e.g. "Morning Slot", "Full Day"
  startTime: string; // "09:00"
  endTime: string; // "13:00"
  isActive: boolean;
  type: 'crew' | 'vehicle' | 'venue' | 'general';
}

const TimeSlotSchema = new Schema(
  {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    type: {
      type: String,
      enum: ['crew', 'vehicle', 'venue', 'general'],
      default: 'general',
      index: true,
    },
  },
  { timestamps: true },
);

TimeSlotSchema.plugin(SoftDeletePlugin);
TimeSlotSchema.plugin(ForensicAuditPlugin);
TimeSlotSchema.plugin(BaseEntityPlugin);

const TimeSlot = mongoose.model<ITimeSlot, SoftDeleteModel<ITimeSlot>>('TimeSlot', TimeSlotSchema);

export default TimeSlot;
