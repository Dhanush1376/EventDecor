import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminInvite extends Document {
  email: string;
  roleAssigned: 'owner' | 'super_admin' | 'main_admin' | 'moderator' | 'support_admin' | 'support' | 'order_manager' | 'content_manager' | 'admin' | 'manager' | 'coordinator';
  permissionsSummary: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  invitedBy: mongoose.Types.ObjectId;
  invitedUser: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  rejectedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminInviteSchema = new Schema<IAdminInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    roleAssigned: {
      type: String,
      required: true,
      enum: ['owner', 'super_admin', 'main_admin', 'moderator', 'support_admin', 'support', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'],
    },
    permissionsSummary: { type: String, default: 'Access Admin Portal' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'revoked'],
      default: 'pending',
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// High-performance compound indexes for user lookups
AdminInviteSchema.index({ email: 1, status: 1 });
AdminInviteSchema.index({ invitedUser: 1, status: 1 });

const AdminInvite = mongoose.model<IAdminInvite>('AdminInvite', AdminInviteSchema);
export default AdminInvite;
