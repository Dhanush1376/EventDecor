import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  requiresApprovalFor: string[];
  isSystemRole: boolean; // Prevent deletion of super admin roles
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppRoleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    requiresApprovalFor: [{ type: String }],
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<IWhatsAppRole>('WhatsAppRole', WhatsAppRoleSchema);
