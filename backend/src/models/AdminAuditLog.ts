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
  // Enterprise entity tracking
  entityType?: string; // e.g. 'Order', 'RentalOrder', 'EventBooking', 'Product'
  entityId?: string;
  action?: string; // e.g. 'status_update', 'refund_initiated', 'team_assigned'
  changes?: Record<string, { previous: any; new: any }>;
  previousValue?: any;
  newValue?: any;
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
    // Enterprise entity tracking
    entityType: { type: String, index: true },
    entityId: { type: String, index: true },
    action: { type: String, index: true },
    changes: { type: Schema.Types.Mixed },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AdminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ path: 1, createdAt: -1 });
AdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// TTL: Auto-cleanup audit logs after 365 days (extended from 90 for compliance)
AdminAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
export default AdminAuditLog;
