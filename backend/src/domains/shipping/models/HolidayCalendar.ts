import mongoose, { Schema, Document } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';

export interface IHolidayCalendar extends Document {
  date: Date;
  name: string;
  type: 'national' | 'regional' | 'warehouse_closure';
  affectedRegions: string[]; // State codes or 'ALL'
  affectedWarehouses: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const HolidayCalendarSchema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['national', 'regional', 'warehouse_closure'],
      required: true,
      index: true,
    },
    affectedRegions: [{ type: String }],
    affectedWarehouses: [{ type: Schema.Types.ObjectId, ref: 'Warehouse' }],
  },
  { timestamps: true },
);

HolidayCalendarSchema.index({ date: 1, type: 1 });

HolidayCalendarSchema.plugin(SoftDeletePlugin);
HolidayCalendarSchema.plugin(ForensicAuditPlugin);

const HolidayCalendar = mongoose.model<IHolidayCalendar, SoftDeleteModel<IHolidayCalendar>>(
  'HolidayCalendar',
  HolidayCalendarSchema,
);

export default HolidayCalendar;
