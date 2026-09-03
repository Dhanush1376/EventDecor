import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpChallenge extends Document {
  challengeId: string;
  purpose:
    | 'AUTHENTICATE_EMAIL'
    | 'AUTHENTICATE_PHONE'
    | 'LINK_PHONE'
    | 'LINK_EMAIL'
    | 'CHANGE_PHONE'
    | 'CHANGE_EMAIL'
    | 'COD_VERIFICATION'
    | 'SENSITIVE_ACTION'
    | 'MAINTENANCE';
  identifier: string;
  identifierType: 'email' | 'phone';
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  exhausted: boolean;
  consumedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

const OtpChallengeSchema = new Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    purpose: {
      type: String,
      enum: [
        'AUTHENTICATE_EMAIL',
        'AUTHENTICATE_PHONE',
        'LINK_PHONE',
        'LINK_EMAIL',
        'CHANGE_PHONE',
        'CHANGE_EMAIL',
        'COD_VERIFICATION',
        'SENSITIVE_ACTION',
        'MAINTENANCE',
      ],
      required: true,
    },
    identifier: { type: String, required: true },
    identifierType: { type: String, enum: ['email', 'phone'], required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    exhausted: { type: Boolean, default: false },
    consumedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL Index: auto-delete expired challenges
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Invalidate previous challenges for same identifier+purpose
OtpChallengeSchema.index({ identifier: 1, purpose: 1, expiresAt: 1 });

const OtpChallenge = mongoose.model<IOtpChallenge>('OtpChallenge', OtpChallengeSchema);
export default OtpChallenge;
