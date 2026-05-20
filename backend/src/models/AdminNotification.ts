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

export default mongoose.model<IAdminNotification>('AdminNotification', AdminNotificationSchema);
