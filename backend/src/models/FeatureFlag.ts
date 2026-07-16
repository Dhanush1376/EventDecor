import mongoose, { Schema, Document } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface IFeatureFlag extends Document {
  key: string;
  isEnabled: boolean;
  description: string;
  tags: string[];
}

const FeatureFlagSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    isEnabled: { type: Boolean, default: false, index: true },
    description: { type: String, default: '' },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

FeatureFlagSchema.plugin(SoftDeletePlugin);

export default mongoose.model<IFeatureFlag, SoftDeleteModel<IFeatureFlag>>(
  'FeatureFlag',
  FeatureFlagSchema,
);
