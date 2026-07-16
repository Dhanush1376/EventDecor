import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppAuditLog extends Document {
  entityType:
    | 'template'
    | 'automation'
    | 'recipient'
    | 'config'
    | 'routingRule'
    | 'provider'
    | 'retryPolicy'
    | 'escalationPolicy';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'toggle' | 'publish' | 'rollback' | 'approve' | 'reject';
  performedBy?: mongoose.Types.ObjectId;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  previousValue?: any;
  newValue?: any;
  changeDescription?: string;
  reason?: string;
  correlationId?: string;
  rollbackTargetId?: mongoose.Types.ObjectId;
}

const WhatsAppAuditLogSchema = new Schema<IWhatsAppAuditLog>(
  {
    entityType: {
      type: String,
      enum: [
        'template',
        'automation',
        'recipient',
        'config',
        'routingRule',
        'provider',
        'retryPolicy',
        'escalationPolicy',
      ],
      required: true,
    },
    entityId: { type: String, required: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'toggle', 'publish', 'rollback', 'approve', 'reject'],
      required: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    changeDescription: { type: String },
    reason: { type: String },
    correlationId: { type: String },
    rollbackTargetId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAuditLog' },
  },
  { timestamps: true },
);

WhatsAppAuditLogSchema.index({ entityType: 1, entityId: 1, performedAt: -1 });
WhatsAppAuditLogSchema.index({ performedBy: 1 });
WhatsAppAuditLogSchema.index({ correlationId: 1 });

// Immutability Hook: Prevent modifications to audit logs
WhatsAppAuditLogSchema.pre(/update|delete|remove/i, function (this: any, next: any) {
  const err = new Error(
    'WhatsAppAuditLog is an append-only immutable collection. Modifications or deletions are strictly prohibited.',
  );
  next(err);
});

export default mongoose.models.WhatsAppAuditLog ||
  mongoose.model<IWhatsAppAuditLog>('WhatsAppAuditLog', WhatsAppAuditLogSchema);
