import mongoose, { Schema, Document } from 'mongoose';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export interface IMaintenanceAuditLog extends Document {
  timestamp: Date;
  userId?: mongoose.Types.ObjectId;
  email?: string;
  role?: string;
  ip: string;
  userAgent: string;
  deviceFingerprint: string;
  action: string;
  result: 'success' | 'failure';
  details: any;
  metadata: any;
  createdAt: Date;
}

const MaintenanceAuditLogSchema: Schema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, lowercase: true, trim: true },
    role: { type: String },
    ip: { type: String, required: true },
    userAgent: { type: String, default: '' },
    deviceFingerprint: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    result: { type: String, enum: ['success', 'failure'], required: true },
    details: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MaintenanceAuditLogSchema.index({ timestamp: -1 });
MaintenanceAuditLogSchema.index({ email: 1, timestamp: -1 });
MaintenanceAuditLogSchema.index({ action: 1, result: 1 });

// Immutable permanent audit logging (No TTL index)

MaintenanceAuditLogSchema.plugin(ForensicAuditPlugin);

const MaintenanceAuditLog = mongoose.model<IMaintenanceAuditLog>(
  'MaintenanceAuditLog',
  MaintenanceAuditLogSchema,
);

export default MaintenanceAuditLog;
