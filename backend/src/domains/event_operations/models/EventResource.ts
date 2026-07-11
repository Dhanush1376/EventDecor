import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IEventResource extends IBaseEntity {
  name: string;
  type: 'product' | 'fabric' | 'flower' | 'lighting' | 'vehicle' | 'equipment';
  description?: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityInTransit: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventResourceSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['product', 'fabric', 'flower', 'lighting', 'vehicle', 'equipment'],
      required: true,
      index: true,
    },
    description: { type: String },
    quantityAvailable: { type: Number, required: true, default: 0 },
    quantityReserved: { type: Number, required: true, default: 0 },
    quantityInTransit: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String },
  },
  { timestamps: true },
);

EventResourceSchema.plugin(SoftDeletePlugin);
EventResourceSchema.plugin(ForensicAuditPlugin);
EventResourceSchema.plugin(BaseEntityPlugin);

const EventResource = mongoose.model<IEventResource, SoftDeleteModel<IEventResource>>(
  'EventResource',
  EventResourceSchema,
);

export default EventResource;
