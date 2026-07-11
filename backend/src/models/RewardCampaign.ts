import mongoose, { Schema, Document } from 'mongoose';

export interface IRewardCampaign extends Document {
  name: string;
  description: string;
  type: 'seasonal' | 'flash_sale' | 'welcome' | 'reactivation' | 'custom';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'archived';
  startDate?: Date;
  endDate?: Date;
  priority: number; // Higher number = higher priority when rules conflict
  budget?: {
    maxTotalSpend?: number;
    currentSpend?: number;
    maxUsesPerUser?: number;
  };
  rules: mongoose.Types.ObjectId[]; // Array of RewardRule references
  version: number;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RewardCampaignSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['seasonal', 'flash_sale', 'welcome', 'reactivation', 'custom'],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    priority: { type: Number, default: 0 },
    budget: {
      maxTotalSpend: { type: Number },
      currentSpend: { type: Number, default: 0 },
      maxUsesPerUser: { type: Number },
    },
    rules: [{ type: Schema.Types.ObjectId, ref: 'RewardRule' }],
    version: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

RewardCampaignSchema.index({ status: 1 });
RewardCampaignSchema.index({ startDate: 1, endDate: 1 });
RewardCampaignSchema.index({ priority: -1 });

export default mongoose.model<IRewardCampaign>('RewardCampaign', RewardCampaignSchema);
