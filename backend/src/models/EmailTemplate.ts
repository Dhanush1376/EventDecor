import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  name: string;
  subjectLine: string;
  htmlContent: string;
  designJson?: string;
  type: 'marketing' | 'transactional' | 'engagement' | 'system';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    subjectLine: { type: String, required: true, trim: true },
    htmlContent: { type: String, required: true },
    designJson: { type: String },
    type: { 
      type: String, 
      enum: ['marketing', 'transactional', 'engagement', 'system'], 
      required: true 
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EmailTemplateSchema.index({ type: 1 });
EmailTemplateSchema.index({ isActive: 1 });

const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;
