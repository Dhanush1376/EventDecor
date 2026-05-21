import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminNotification extends Document {
  title: string;
  message: string;
  type: 'order' | 'custom_request' | 'payment' | 'inquiry' | 'user' | 'system';
  actionLink?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminNotificationSchema = new Schema<IAdminNotification>({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['order', 'custom_request', 'payment', 'inquiry', 'user', 'system'],
    required: true,
  },
  actionLink: {
    type: String,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
}, { timestamps: true });

// High-Performance Production Indexes
AdminNotificationSchema.index({ isRead: 1, createdAt: -1 });
AdminNotificationSchema.index({ type: 1, createdAt: -1 });

// TTL: Auto-cleanup notifications older than 60 days
AdminNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export default mongoose.model<IAdminNotification>('AdminNotification', AdminNotificationSchema);
