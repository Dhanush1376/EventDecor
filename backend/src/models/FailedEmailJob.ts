import mongoose, { Document, Schema } from 'mongoose';

export interface IFailedEmailJob extends Document {
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt: Date;
  status: 'pending' | 'exhausted';
  createdAt: Date;
  updatedAt: Date;
}

const FailedEmailJobSchema = new Schema<IFailedEmailJob>(
  {
    payload: { type: Schema.Types.Mixed, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String },
    nextRetryAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'exhausted'], default: 'pending', index: true },
  },
  { timestamps: true }
);

FailedEmailJobSchema.index({ status: 1, nextRetryAt: 1 });

const FailedEmailJob = mongoose.model<IFailedEmailJob>('FailedEmailJob', FailedEmailJobSchema);
export default FailedEmailJob;
