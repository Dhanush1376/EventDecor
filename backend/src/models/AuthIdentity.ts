import mongoose, { Schema, Document } from 'mongoose';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export interface IAuthIdentity extends Document {
  userId: mongoose.Types.ObjectId;
  provider: 'email' | 'phone' | 'google';
  providerSubjectId: string;
  verifiedAt?: Date;
  metadata?: {
    displayName?: string;
    avatar?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AuthIdentitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['email', 'phone', 'google'], required: true },
    providerSubjectId: { type: String, required: true },
    verifiedAt: { type: Date },
    metadata: {
      displayName: { type: String },
      avatar: { type: String },
      email: { type: String },
    },
  },
  { timestamps: true },
);

// CRITICAL: Database-level uniqueness — the FINAL AUTHORITY for identity conflicts
AuthIdentitySchema.index({ provider: 1, providerSubjectId: 1 }, { unique: true });

// Fast lookup by user
AuthIdentitySchema.index({ userId: 1, provider: 1 });

AuthIdentitySchema.plugin(ForensicAuditPlugin);

const AuthIdentity = mongoose.model<IAuthIdentity>('AuthIdentity', AuthIdentitySchema);
export default AuthIdentity;
