import mongoose, { Schema, Document } from 'mongoose';

export interface IBusinessRule extends Document {
  name: string;
  description: string;
  isActive: boolean;
  targetEntity: 'Order' | 'RentalOrder' | 'CustomOrder';
  priority: number; // Lower number = higher priority
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
    value: any;
  }[];
  action: 'require_approval' | 'reject' | 'flag_for_review';
  approverRoles: string[]; // e.g. ['admin', 'manager']
}

const BusinessRuleSchema = new Schema<IBusinessRule>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    targetEntity: { type: String, enum: ['Order', 'RentalOrder', 'CustomOrder'], required: true },
    priority: { type: Number, default: 100 },
    conditions: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in'],
          required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],
    action: {
      type: String,
      enum: ['require_approval', 'reject', 'flag_for_review'],
      required: true,
    },
    approverRoles: [{ type: String }],
  },
  { timestamps: true },
);

export default mongoose.models.BusinessRule ||
  mongoose.model<IBusinessRule>('BusinessRule', BusinessRuleSchema);
