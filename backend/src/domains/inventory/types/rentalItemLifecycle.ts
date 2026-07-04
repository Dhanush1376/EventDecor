import mongoose from 'mongoose';

export interface IRentalItemLifecycle extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  sku: string;
  usageCount: number;
  maxUsageCycles: number;
  cleaningHistory: {
    date: Date;
    type: 'standard' | 'deep';
    performedBy: string;
    notes?: string;
  }[];
  repairHistory: {
    date: Date;
    issue: string;
    resolution: string;
    cost: number;
    performedBy: string;
  }[];
  damageHistory: {
    date: Date;
    description: string;
    severity: 'minor' | 'moderate' | 'severe';
    photos: string[];
    rentalOrderId?: mongoose.Types.ObjectId;
  }[];
  currentCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'retired';
  retirementDate?: Date;
  retirementReason?: string;
  isRetired: boolean;
  createdAt: Date;
  updatedAt: Date;
}
