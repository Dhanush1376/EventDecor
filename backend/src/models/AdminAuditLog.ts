import mongoose, { Schema, Document } from 'mongoose';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';
import storeSettingsService from '../services/StoreSettingsService';

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
  entityType?: string; // e.g. 'Order', 'RentalOrder', 'EventJob', 'Product'
  entityId?: string;
  action?: string; // e.g. 'status_update', 'refund_initiated', 'team_assigned'
  changes?: Record<string, { previous: any; new: any }>;
  previousValue?: any;
  newValue?: any;
  createdAt: Date;
  expiresAt?: Date;
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
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AdminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ path: 1, createdAt: -1 });
AdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// Dynamic TTL index (expiresAt calculated on save) for eventual cleanup or archival
AdminAuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

AdminAuditLogSchema.pre('save', async function () {
  if (!this.expiresAt) {
    try {
      const settings = await storeSettingsService.getSettings();
      const days = settings.retentionPolicies?.adminAuditLogsDays || 180;
      this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } catch (_err) {
      this.expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days fallback
    }
  }
});

AdminAuditLogSchema.plugin(ForensicAuditPlugin);

const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
export default AdminAuditLog;
