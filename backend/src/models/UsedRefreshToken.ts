import mongoose, { Schema, Document } from 'mongoose';

export interface IUsedRefreshToken extends Document {
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  userAgent?: string;
}

const UsedRefreshTokenSchema: Schema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// High-performance self-cleaning TTL index
UsedRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UsedRefreshToken = mongoose.model<IUsedRefreshToken>('UsedRefreshToken', UsedRefreshTokenSchema);
export default UsedRefreshToken;
