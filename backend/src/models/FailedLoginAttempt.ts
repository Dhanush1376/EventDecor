import mongoose, { Schema, Document } from 'mongoose';

export interface IFailedLoginAttempt extends Document {
  email: string;
  attempts: number;
  lockoutUntil?: Date;
  expiresAt: Date;
}

const FailedLoginAttemptSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    attempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// High-performance self-cleaning TTL index to reset failure state after 15 minutes of inactivity
FailedLoginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const FailedLoginAttempt = mongoose.model<IFailedLoginAttempt>('FailedLoginAttempt', FailedLoginAttemptSchema);
export default FailedLoginAttempt;
