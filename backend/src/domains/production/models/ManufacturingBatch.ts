import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IManufacturingBatch extends Document {
  batchNumber: string;
  productId: Types.ObjectId;
  totalQuantity: number;
  completedQuantity: number;
  status: 'planning' | 'in_production' | 'completed' | 'cancelled';
  startDate: Date;
  expectedCompletionDate: Date;
  productionOrders: Types.ObjectId[];
}

const ManufacturingBatchSchema = new Schema<IManufacturingBatch>(
  {
    batchNumber: { type: String, required: true, unique: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    totalQuantity: { type: Number, required: true },
    completedQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['planning', 'in_production', 'completed', 'cancelled'],
      default: 'planning',
    },
    startDate: { type: Date },
    expectedCompletionDate: { type: Date },
    productionOrders: [{ type: Schema.Types.ObjectId, ref: 'ProductionOrder' }],
  },
  { timestamps: true },
);

ManufacturingBatchSchema.index({ batchNumber: 1 }, { unique: true });
ManufacturingBatchSchema.index({ status: 1 });

export default mongoose.models.ManufacturingBatch ||
  mongoose.model<IManufacturingBatch>('ManufacturingBatch', ManufacturingBatchSchema);
