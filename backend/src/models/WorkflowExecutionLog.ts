import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflowExecutionLog extends Document {
  executionId: string;
  automationId: mongoose.Types.ObjectId;
  automationName: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  triggerPayload: any;
  triggerTimestamp: Date;
  completionTimestamp?: Date;
  nodeTrace: {
    nodeId: string;
    nodeType: string;
    status: 'success' | 'failed' | 'skipped' | 'waiting';
    evaluatedEdge?: string;
    enteredAt: Date;
    exitedAt?: Date;
    latencyMs?: number;
    error?: string;
  }[];
}

const WorkflowExecutionLogSchema = new Schema(
  {
    executionId: { type: String, required: true, unique: true },
    automationId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAutomation', required: true },
    automationName: { type: String, required: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'paused'],
      default: 'running',
    },
    triggerPayload: { type: Schema.Types.Mixed },
    triggerTimestamp: { type: Date, required: true, default: Date.now },
    completionTimestamp: { type: Date },
    nodeTrace: [
      {
        nodeId: { type: String, required: true },
        nodeType: { type: String, required: true },
        status: { type: String, enum: ['success', 'failed', 'skipped', 'waiting'], required: true },
        evaluatedEdge: { type: String },
        enteredAt: { type: Date, required: true },
        exitedAt: { type: Date },
        latencyMs: { type: Number },
        error: { type: String },
      },
    ],
  },
  { timestamps: true },
);

WorkflowExecutionLogSchema.index({ automationId: 1, triggerTimestamp: -1 });
WorkflowExecutionLogSchema.index({ status: 1 });

export default mongoose.model<IWorkflowExecutionLog>(
  'WorkflowExecutionLog',
  WorkflowExecutionLogSchema,
);
