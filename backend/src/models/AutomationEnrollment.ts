import mongoose, { Schema, Document } from 'mongoose';

export interface IStepExecution {
  stepNumber: number;
  executedAt: Date;
  notificationLogId?: mongoose.Types.ObjectId;
  status: 'sent' | 'failed' | 'skipped';
  skipReason?: string;
}

export interface IAutomationEnrollment extends Document {
  automationId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  customerEmail: string;
  triggerType: string;
  currentStepIndex: number;
  nextExecutionAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  cancelReason?: 'purchased' | 'unsubscribed' | 'cart_cleared' | 'manual' | 'condition_failed';
  contextData: Record<string, any>;
  stepExecutions: IStepExecution[];
  createdAt: Date;
  updatedAt: Date;
}

const AutomationEnrollmentSchema: Schema = new Schema(
  {
    automationId: { type: Schema.Types.ObjectId, ref: 'MarketingAutomation', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    triggerType: { type: String, required: true },
    currentStepIndex: { type: Number, default: 0 },
    nextExecutionAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    cancelReason: {
      type: String,
      enum: ['purchased', 'unsubscribed', 'cart_cleared', 'manual', 'condition_failed'],
    },
    contextData: { type: Schema.Types.Mixed, default: {} },
    stepExecutions: [
      {
        stepNumber: { type: Number, required: true },
        executedAt: { type: Date, default: Date.now },
        notificationLogId: { type: Schema.Types.ObjectId, ref: 'NotificationLog' },
        status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent' },
        skipReason: { type: String },
      },
    ],
  },
  { timestamps: true },
);

AutomationEnrollmentSchema.index({ status: 1, nextExecutionAt: 1 });
AutomationEnrollmentSchema.index({ userId: 1, triggerType: 1, status: 1 });
AutomationEnrollmentSchema.index({ customerEmail: 1, triggerType: 1, status: 1 });
AutomationEnrollmentSchema.index({ automationId: 1, status: 1 });

const AutomationEnrollment = mongoose.model<IAutomationEnrollment>(
  'AutomationEnrollment',
  AutomationEnrollmentSchema,
);

export default AutomationEnrollment;
