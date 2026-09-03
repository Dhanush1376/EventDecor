import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  eventType:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'SIGNUP_SUCCESS'
    | 'OTP_REQUESTED'
    | 'OTP_VERIFIED'
    | 'OTP_FAILED'
    | 'OTP_EXHAUSTED'
    | 'GOOGLE_AUTH_SUCCESS'
    | 'GOOGLE_AUTH_FAILURE'
    | 'ACCOUNT_LINK_SUCCESS'
    | 'ACCOUNT_LINK_FAILURE'
    | 'ACCOUNT_LINK_CONFLICT'
    | 'ACCOUNT_UNLINK_SUCCESS'
    | 'ACCOUNT_UNLINK_BLOCKED'
    | 'SESSION_CREATED'
    | 'SESSION_REVOKED'
    | 'SESSION_REVOKED_ALL'
    | 'PROVIDER_CHANGED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SMS_ABUSE_DETECTED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'ACCOUNT_LOCKED';
  success: boolean;
  ip: string;
  userAgent: string;
  metadata?: {
    provider?: string;
    identifierHash?: string;
    challengeId?: string;
    reason?: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

const SecurityAuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventType: {
      type: String,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'SIGNUP_SUCCESS',
        'OTP_REQUESTED',
        'OTP_VERIFIED',
        'OTP_FAILED',
        'OTP_EXHAUSTED',
        'GOOGLE_AUTH_SUCCESS',
        'GOOGLE_AUTH_FAILURE',
        'ACCOUNT_LINK_SUCCESS',
        'ACCOUNT_LINK_FAILURE',
        'ACCOUNT_LINK_CONFLICT',
        'ACCOUNT_UNLINK_SUCCESS',
        'ACCOUNT_UNLINK_BLOCKED',
        'SESSION_CREATED',
        'SESSION_REVOKED',
        'SESSION_REVOKED_ALL',
        'PROVIDER_CHANGED',
        'RATE_LIMIT_EXCEEDED',
        'SMS_ABUSE_DETECTED',
        'SUSPICIOUS_ACTIVITY',
        'ACCOUNT_LOCKED',
      ],
      required: true,
    },
    success: { type: Boolean, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String },
    metadata: {
      provider: { type: String },
      identifierHash: { type: String },
      challengeId: { type: String },
      reason: { type: String },
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SecurityAuditLogSchema.index({ userId: 1, createdAt: -1 });
SecurityAuditLogSchema.index({ eventType: 1, createdAt: -1 });
SecurityAuditLogSchema.index({ ip: 1, createdAt: -1 });
// TTL Index
SecurityAuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SecurityAuditLog = mongoose.model<ISecurityAuditLog>(
  'SecurityAuditLog',
  SecurityAuditLogSchema,
);
export default SecurityAuditLog;
