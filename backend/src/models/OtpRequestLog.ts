import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpRequestLog extends Document {
  ip: string;
  email: string;
  action: 'request' | 'verify' | 'verify_fail';
  createdAt: Date;
}

const OtpRequestLogSchema: Schema = new Schema(
  {
    ip: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    action: { type: String, enum: ['request', 'verify', 'verify_fail'], required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  }
);

// TTL Index: expire documents after 1 hour (3600 seconds)
OtpRequestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Indexes for fast rate limit queries
OtpRequestLogSchema.index({ ip: 1, action: 1, createdAt: 1 });
OtpRequestLogSchema.index({ email: 1, action: 1, createdAt: 1 });

const OtpRequestLog = mongoose.model<IOtpRequestLog>('OtpRequestLog', OtpRequestLogSchema);

export default OtpRequestLog;
