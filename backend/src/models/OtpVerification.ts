import mongoose, { Schema, Document } from 'mongoose';

export const OTP_MAX_ATTEMPTS = 5;

export interface IOtpVerification extends Document {
  email: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  exhausted: boolean;
  type: 'auth' | 'cod' | 'maintenance';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpVerificationSchema: Schema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, required: true },
    maxAttempts: { type: Number, default: OTP_MAX_ATTEMPTS, required: true },
    exhausted: { type: Boolean, default: false, required: true },
    type: { type: String, enum: ['auth', 'cod', 'maintenance'], default: 'auth', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL Index for automatic auto-expiration
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound lookups by email and type
OtpVerificationSchema.index({ email: 1, type: 1 });
OtpVerificationSchema.index({ email: 1, expiresAt: 1 });

const OtpVerification = mongoose.model<IOtpVerification>('OtpVerification', OtpVerificationSchema);

export default OtpVerification;
