import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  actorRole?: string;
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, trim: true, lowercase: true },
    actorRole: { type: String, trim: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ path: 1, createdAt: -1 });

// TTL: Auto-cleanup audit logs older than 180 days (6 months retention)
AdminAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
export default AdminAuditLog;
