import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProductionQueue extends Document {
  station: 'cutting' | 'assembly' | 'finishing' | 'quality_check' | 'packing';
  productionOrderId: Types.ObjectId;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: Types.ObjectId;
  status: 'queued' | 'in_progress' | 'completed' | 'blocked';
  blockReason?: string;
  enteredAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const ProductionQueueSchema = new Schema<IProductionQueue>(
  {
    station: { type: String, required: true },
    productionOrderId: { type: Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['queued', 'in_progress', 'completed', 'blocked'],
      default: 'queued',
    },
    blockReason: { type: String },
    enteredAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

ProductionQueueSchema.index({ station: 1, status: 1, priority: -1, enteredAt: 1 });
ProductionQueueSchema.index({ productionOrderId: 1 });

export default mongoose.models.ProductionQueue ||
  mongoose.model<IProductionQueue>('ProductionQueue', ProductionQueueSchema);
