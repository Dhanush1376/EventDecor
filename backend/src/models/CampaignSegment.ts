import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';

export interface ISegmentRule {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'in_range'
    | 'is_true'
    | 'is_false';
  value: any;
}

export interface ICampaignSegment extends ISoftDeleted {
  name: string;
  description?: string;
  combinator: 'AND' | 'OR';
  rules: ISegmentRule[];
  estimatedCount: number;
  lastCalculatedAt?: Date;
  isSystem: boolean;
  systemKey?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSegmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    combinator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    rules: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: [
            'equals',
            'not_equals',
            'greater_than',
            'less_than',
            'contains',
            'in_range',
            'is_true',
            'is_false',
          ],
          required: true,
        },
        value: { type: Schema.Types.Mixed },
      },
    ],
    estimatedCount: { type: Number, default: 0 },
    lastCalculatedAt: { type: Date },
    isSystem: { type: Boolean, default: false },
    systemKey: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

CampaignSegmentSchema.index({ isSystem: 1 });
CampaignSegmentSchema.index({ systemKey: 1 }, { sparse: true });
CampaignSegmentSchema.index({ createdAt: -1 });

CampaignSegmentSchema.plugin(SoftDeletePlugin);

const CampaignSegment = mongoose.model<ICampaignSegment, SoftDeleteModel<ICampaignSegment>>(
  'CampaignSegment',
  CampaignSegmentSchema,
);

export default CampaignSegment;
