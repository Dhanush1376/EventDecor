import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IEventCrew extends IBaseEntity {
  name: string;
  role:
    | 'team_leader'
    | 'decorator'
    | 'electrician'
    | 'driver'
    | 'helper'
    | 'florist'
    | 'photographer';
  phone: string;
  email?: string;
  status: 'available' | 'on_leave' | 'busy' | 'inactive';
  skills?: string[];
  vehicleAssigned?: string; // If driver
  createdAt: Date;
  updatedAt: Date;
}

const EventCrewSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: [
        'team_leader',
        'decorator',
        'electrician',
        'driver',
        'helper',
        'florist',
        'photographer',
      ],
      required: true,
      index: true,
    },
    phone: { type: String, required: true },
    email: { type: String },
    status: {
      type: String,
      enum: ['available', 'on_leave', 'busy', 'inactive'],
      default: 'available',
      index: true,
    },
    skills: [{ type: String }],
    vehicleAssigned: { type: String },
  },
  { timestamps: true },
);

EventCrewSchema.plugin(SoftDeletePlugin);
EventCrewSchema.plugin(ForensicAuditPlugin);
EventCrewSchema.plugin(BaseEntityPlugin);

const EventCrew = mongoose.model<IEventCrew, SoftDeleteModel<IEventCrew>>(
  'EventCrew',
  EventCrewSchema,
);

export default EventCrew;
