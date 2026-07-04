import mongoose, { Schema, Document } from 'mongoose';

export interface IBusinessRule extends Document {
  title: string;
  category: string;
  active: boolean;
  conditions: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessRuleSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    active: { type: Boolean, default: true },
    conditions: { type: String, required: true },
    action: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IBusinessRule>('BusinessRule', BusinessRuleSchema);
