import mongoose, { Schema, Document } from 'mongoose';

export interface IApprovalRequest extends Document {
  type: string;
  requesterId: string;
  requesterName?: string;
  details: string;
  amount: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Approved' | 'Rejected';
  approveConsequence: string;
  rejectConsequence: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema: Schema = new Schema(
  {
    type: { type: String, required: true },
    requesterId: { type: String, required: true },
    requesterName: { type: String },
    details: { type: String, required: true },
    amount: { type: String, required: true },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    approveConsequence: { type: String, required: true },
    rejectConsequence: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.SystemApprovalRequest ||
  mongoose.model<IApprovalRequest>('SystemApprovalRequest', ApprovalRequestSchema);
