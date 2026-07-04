import mongoose from 'mongoose';

export type ProductionStage =
  | 'pending_material'
  | 'material_sourced'
  | 'cutting'
  | 'assembly'
  | 'finishing'
  | 'quality_check'
  | 'packing'
  | 'ready_for_warehouse'
  | 'handover_complete';

export interface IProductionOrder extends mongoose.Document {
  productionOrderId: string;
  orderId: mongoose.Types.ObjectId;
  orderType: 'purchase' | 'rental' | 'custom';
  items: {
    productId: mongoose.Types.ObjectId;
    sku: string;
    quantity: number;
    rawMaterials: {
      material: string;
      quantity: number;
      unit: string;
      status: 'pending' | 'reserved' | 'consumed';
    }[];
    currentStage: string;
  }[];
  assignedWorkers: {
    userId: mongoose.Types.ObjectId;
    name: string;
    role: string;
    assignedAt: Date;
  }[];
  priority: 'standard' | 'express' | 'urgent';
  stages: {
    stage: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    worker?: {
      userId: mongoose.Types.ObjectId;
      name: string;
    };
    notes?: string;
    photos?: string[];
    qualityScore?: number;
  }[];
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  status: 'queued' | 'in_progress' | 'completed' | 'sent_to_warehouse';
  createdAt: Date;
  updatedAt: Date;
}
