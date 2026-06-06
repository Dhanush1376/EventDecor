import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomOrderField {
  id: string;
  type:
    | 'text'
    | 'textarea'
    | 'rich_text'
    | 'dropdown'
    | 'multiselect'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'color'
    | 'number'
    | 'file'
    | 'image'
    | 'toggle'
    | 'url'
    | 'phone'
    | 'email'
    | 'custom';
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
  };
  defaultValue?: any;
  order: number;
}

export interface ICustomOrderStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  isHidden: boolean;
  fields: ICustomOrderField[];
}

export interface ICustomOrderCondition {
  id: string;
  fieldId: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'is_empty'
    | 'is_not_empty';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
  targetFieldIds: string[];
}

export interface ICustomOrderWorkflowStatus {
  id: string;
  label: string;
  color: string;
  order: number;
  permissions: string[];
}

export interface ICustomOrderButton {
  id: string;
  label: string;
  action:
    | 'next'
    | 'prev'
    | 'submit'
    | 'save_draft'
    | 'request_quote'
    | 'approve'
    | 'reject'
    | 'custom';
  isVisible: boolean;
  order: number;
}

export interface ICustomOrderType {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  steps: ICustomOrderStep[];
  conditions: ICustomOrderCondition[];
  workflows: ICustomOrderWorkflowStatus[];
  buttons: ICustomOrderButton[];
}

export interface ICustomOrderConfig extends Document {
  version: number;
  status: 'draft' | 'published';
  types: ICustomOrderType[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Schemas ───
const CustomOrderFieldSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  placeholder: { type: String },
  helpText: { type: String },
  required: { type: Boolean, default: false },
  options: [{ value: String, label: String }],
  validation: { type: Schema.Types.Mixed },
  defaultValue: { type: Schema.Types.Mixed },
  order: { type: Number, default: 0 },
});

const CustomOrderStepSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  isHidden: { type: Boolean, default: false },
  fields: { type: [CustomOrderFieldSchema], default: [] },
});

const CustomOrderConditionSchema = new Schema({
  id: { type: String, required: true },
  fieldId: { type: String, required: true },
  operator: { type: String, required: true },
  value: { type: Schema.Types.Mixed },
  action: { type: String, required: true },
  targetFieldIds: { type: [String], default: [] },
});

const CustomOrderWorkflowStatusSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, default: '#685C57' },
  order: { type: Number, default: 0 },
  permissions: { type: [String], default: [] },
});

const CustomOrderButtonSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  action: { type: String, required: true },
  isVisible: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
});

const CustomOrderTypeSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  enabled: { type: Boolean, default: true },
  steps: { type: [CustomOrderStepSchema], default: [] },
  conditions: { type: [CustomOrderConditionSchema], default: [] },
  workflows: { type: [CustomOrderWorkflowStatusSchema], default: [] },
  buttons: { type: [CustomOrderButtonSchema], default: [] },
});

const CustomOrderConfigSchema = new Schema(
  {
    version: { type: Number, required: true, unique: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    types: { type: [CustomOrderTypeSchema], default: [] },
    isActive: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.models.CustomOrderConfig ||
  mongoose.model<ICustomOrderConfig>('CustomOrderConfig', CustomOrderConfigSchema);
