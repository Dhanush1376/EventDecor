import mongoose, { Schema, Document } from 'mongoose';

// Flexible condition structure for the UI builder
export interface IRuleCondition {
  field: string; // e.g. 'order.total', 'user.loyaltyTier', 'user.totalOrders'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
}

export interface IRuleConditionGroup {
  logic: 'AND' | 'OR';
  conditions: (IRuleCondition | IRuleConditionGroup)[];
}

export interface IRuleOutcome {
  type: 'credit_wallet' | 'issue_coupon' | 'multiplier_points' | 'tier_upgrade';
  value: any; // e.g. { amount: 50 }, { multiplier: 2 }, etc.
}

export interface IRewardRule extends Document {
  campaignId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  triggerEvent: 'on_signup' | 'on_checkout' | 'on_review' | 'on_birthday' | 'custom';
  conditions: IRuleConditionGroup;
  outcomes: IRuleOutcome[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RewardRuleSchema: Schema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'RewardCampaign', required: true },
    name: { type: String, required: true },
    description: { type: String },
    triggerEvent: {
      type: String,
      enum: ['on_signup', 'on_checkout', 'on_review', 'on_birthday', 'custom'],
      required: true,
    },
    conditions: { type: Schema.Types.Mixed, required: true }, // Store as JSON for flexible nested AND/OR
    outcomes: [
      {
        type: {
          type: String,
          enum: ['credit_wallet', 'issue_coupon', 'multiplier_points', 'tier_upgrade'],
          required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

RewardRuleSchema.index({ campaignId: 1 });
RewardRuleSchema.index({ triggerEvent: 1 });

export default mongoose.model<IRewardRule>('RewardRule', RewardRuleSchema);
