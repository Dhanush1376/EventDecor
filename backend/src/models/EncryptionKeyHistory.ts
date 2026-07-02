import mongoose, { Schema, Document } from 'mongoose';

export type KeyStatus = 'active' | 'retired' | 'compromised';

export interface IEncryptionKeyHistory extends Document {
  keyId: string; // e.g., 'v1', 'v2'
  algorithm: string; // e.g., 'aes-256-gcm'
  keyFingerprint: string; // SHA-256 hash of the key material (NOT the key itself)
  status: KeyStatus;

  activatedAt?: Date; // When it became the primary key
  retiredAt?: Date; // When it was replaced
  expiresAt?: Date; // Recommended expiry date
  retirementReason?: 'rotation_schedule' | 'compromised' | 'manual';

  backupsEncrypted: number;
  lastUsedAt?: Date;
  canDecrypt: boolean; // Retired keys can decrypt old backups, compromised keys maybe shouldn't

  createdAt: Date;
  updatedAt: Date;
}

const EncryptionKeyHistorySchema = new Schema<IEncryptionKeyHistory>(
  {
    keyId: { type: String, required: true, unique: true },
    algorithm: { type: String, required: true, default: 'aes-256-gcm' },
    keyFingerprint: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'retired', 'compromised'],
      default: 'active',
    },

    activatedAt: { type: Date },
    retiredAt: { type: Date },
    expiresAt: { type: Date },
    retirementReason: { type: String, enum: ['rotation_schedule', 'compromised', 'manual'] },

    backupsEncrypted: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    canDecrypt: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

EncryptionKeyHistorySchema.index({ status: 1 });

const EncryptionKeyHistory =
  mongoose.models.EncryptionKeyHistory ||
  mongoose.model<IEncryptionKeyHistory>('EncryptionKeyHistory', EncryptionKeyHistorySchema);
export default EncryptionKeyHistory;
