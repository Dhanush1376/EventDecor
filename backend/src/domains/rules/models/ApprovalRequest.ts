import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApprovalRequest extends Document {
  entityId: Types.ObjectId;
  entityType: 'Order' | 'RentalOrder' | 'CustomOrder';
  ruleId: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requestedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
}

const ApprovalRequestSchema = new Schema<IApprovalRequest>(
  {
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, enum: ['Order', 'RentalOrder', 'CustomOrder'], required: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'BusinessRule', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
  },
  { timestamps: true },
);

export default mongoose.models.ApprovalRequest ||
  mongoose.model<IApprovalRequest>('ApprovalRequest', ApprovalRequestSchema);
