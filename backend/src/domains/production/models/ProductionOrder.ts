import mongoose, { Schema } from 'mongoose';
import { IProductionOrder } from '../types/production';

const ProductionOrderSchema = new Schema<IProductionOrder>(
  {
    productionOrderId: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    orderType: { type: String, enum: ['purchase', 'rental', 'custom'], required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true },
        rawMaterials: [
          {
            material: { type: String, required: true },
            quantity: { type: Number, required: true },
            unit: { type: String, required: true },
            status: { type: String, enum: ['pending', 'reserved', 'consumed'], default: 'pending' },
          },
        ],
        currentStage: { type: String, default: 'pending_material' },
      },
    ],
    assignedWorkers: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        role: { type: String },
        assignedAt: { type: Date },
      },
    ],
    priority: { type: String, enum: ['standard', 'express', 'urgent'], default: 'standard' },
    stages: [
      {
        stage: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'skipped'],
          default: 'pending',
        },
        startedAt: { type: Date },
        completedAt: { type: Date },
        worker: {
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          name: { type: String },
        },
        notes: { type: String },
        photos: [{ type: String }],
        qualityScore: { type: Number },
      },
    ],
    estimatedCompletionDate: { type: Date },
    actualCompletionDate: { type: Date },
    status: {
      type: String,
      enum: ['queued', 'in_progress', 'completed', 'sent_to_warehouse'],
      default: 'queued',
    },
  },
  { timestamps: true },
);

// Indexes
ProductionOrderSchema.index({ productionOrderId: 1 }, { unique: true });
ProductionOrderSchema.index({ status: 1, priority: -1, createdAt: 1 });
ProductionOrderSchema.index({ 'items.currentStage': 1 });

export default mongoose.models.ProductionOrder ||
  mongoose.model<IProductionOrder>('ProductionOrder', ProductionOrderSchema);
