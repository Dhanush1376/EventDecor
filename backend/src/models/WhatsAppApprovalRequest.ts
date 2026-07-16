import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWhatsAppApprovalRequest extends Document {
  requestedBy: Types.ObjectId;
  actionTitle: string; // E.g., 'Dispatch Campaign: Diwali Sale'
  targetAction: string; // E.g., 'campaign:dispatch'
  targetEndpoint: string; // E.g., '/notifications/whatsapp/campaigns/123/dispatch'
  targetMethod: string; // E.g., 'POST'
  payload: any; // The JSON body of the intercepted request
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: Types.ObjectId;
  comments?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppApprovalRequestSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actionTitle: { type: String, required: true },
    targetAction: { type: String, required: true },
    targetEndpoint: { type: String, required: true },
    targetMethod: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    comments: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IWhatsAppApprovalRequest>(
  'WhatsAppApprovalRequest',
  WhatsAppApprovalRequestSchema,
);
