import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceSession extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  sessionTokenHash: string;
  ip: string;
  userAgent: string;
  deviceFingerprint: string;
  expiresAt: Date;
  lastActivity: Date;
  idleTimeoutMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceSessionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    sessionTokenHash: { type: String, required: true, unique: true },
    ip: { type: String, required: true },
    userAgent: { type: String, default: '' },
    deviceFingerprint: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    lastActivity: { type: Date, default: Date.now },
    idleTimeoutMinutes: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// TTL index to automatically delete expired sessions
MaintenanceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// For rapid lookup during middleware enforcement
MaintenanceSessionSchema.index({ sessionTokenHash: 1, isActive: 1 });
MaintenanceSessionSchema.index({ userId: 1, isActive: 1 });

const MaintenanceSession = mongoose.model<IMaintenanceSession>(
  'MaintenanceSession',
  MaintenanceSessionSchema,
);

export default MaintenanceSession;
