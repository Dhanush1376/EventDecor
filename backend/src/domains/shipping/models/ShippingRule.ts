import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IShippingRule extends IBaseEntity {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: {
    minOrderValue?: number;
    maxOrderValue?: number;
    minWeight?: number;
    maxWeight?: number;
    zones?: string[]; // Array of DeliveryZone IDs
    categories?: string[];
  };
  action: {
    type: 'flat_rate' | 'free_shipping' | 'weight_based' | 'percentage_of_order';
    value: number; // Flat fee, or multiplier for weight/percentage
  };
  createdAt: Date;
  updatedAt: Date;
}

const ShippingRuleSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0, index: true }, // Higher priority executes first
    conditions: {
      minOrderValue: { type: Number },
      maxOrderValue: { type: Number },
      minWeight: { type: Number },
      maxWeight: { type: Number },
      zones: [{ type: Schema.Types.ObjectId, ref: 'DeliveryZone' }],
      categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    },
    action: {
      type: {
        type: String,
        enum: ['flat_rate', 'free_shipping', 'weight_based', 'percentage_of_order'],
        required: true,
      },
      value: { type: Number, required: true, default: 0 },
    },
  },
  { timestamps: true },
);

ShippingRuleSchema.plugin(SoftDeletePlugin);
ShippingRuleSchema.plugin(ForensicAuditPlugin);
ShippingRuleSchema.plugin(BaseEntityPlugin);

const ShippingRule = mongoose.model<IShippingRule, SoftDeleteModel<IShippingRule>>(
  'ShippingRule',
  ShippingRuleSchema,
);

export default ShippingRule;
