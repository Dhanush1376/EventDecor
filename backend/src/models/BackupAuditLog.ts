import mongoose, { Schema, Document } from 'mongoose';

export type BackupAuditAction =
  | 'backup_created'
  | 'backup_failed'
  | 'backup_rolled_back'
  | 'backup_deleted'
  | 'backup_locked'
  | 'backup_unlocked'
  | 'restore_planned'
  | 'restore_simulated'
  | 'restore_started'
  | 'restore_completed'
  | 'restore_failed'
  | 'restore_validated'
  | 'restore_rolled_back'
  | 'rollback_snapshot_created'
  | 'config_changed'
  | 'verification_run'
  | 'retention_cleanup'
  | 'emergency_triggered'
  | 'anomaly_detected'
  | 'dr_drill_started'
  | 'dr_drill_completed'
  | 'chaos_test_run'
  | 'key_rotated'
  | 'key_retired'
  | 'signature_verified'
  | 'signature_failed'
  | 'recommendation_generated'
  | 'state_transition';

export interface IBackupAuditLog extends Document {
  action: BackupAuditAction;
  performedBy: string; // userId or 'system'
  backupId?: string; // Reference to BackupRecord.backupId
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  stateTransition?: {
    from: string;
    to: string;
    reason: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BackupAuditLogSchema = new Schema<IBackupAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: { type: String, required: true },
    backupId: { type: String, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    stateTransition: {
      from: { type: String },
      to: { type: String },
      reason: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for searching
BackupAuditLogSchema.index({ createdAt: -1 });
BackupAuditLogSchema.index({ action: 1, createdAt: -1 });
BackupAuditLogSchema.index({ performedBy: 1, createdAt: -1 });

// Protection Hooks: Prevent modification or deletion to ensure immutability
BackupAuditLogSchema.pre(/update|delete|remove/i, function (this: any, next: any) {
  next(new Error('Backup audit logs are immutable and cannot be updated or deleted.'));
});

const BackupAuditLog =
  mongoose.models.BackupAuditLog ||
  mongoose.model<IBackupAuditLog>('BackupAuditLog', BackupAuditLogSchema);
export default BackupAuditLog;
