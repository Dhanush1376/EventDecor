import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import { NotificationEvent } from '../services/notifications/types';

export interface IInAppNotification extends ISoftDeleted {
  user: mongoose.Types.ObjectId;
  event: NotificationEvent;
  title: string;
  message: string;
  type:
    | 'order'
    | 'payment'
    | 'account'
    | 'booking'
    | 'rental'
    | 'engagement'
    | 'support'
    | 'system';
  priority: 'critical' | 'high' | 'normal' | 'low';
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

const InAppNotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['order', 'payment', 'account', 'booking', 'rental', 'engagement', 'support', 'system'],
      default: 'system',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },
    read: { type: Boolean, default: false, index: true },
    archived: { type: Boolean, default: false, index: true },
    actionUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL index for auto-cleanup
  },
  { timestamps: true },
);

// Compound indexes for fast querying
InAppNotificationSchema.index({ user: 1, createdAt: -1 });
InAppNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

InAppNotificationSchema.plugin(SoftDeletePlugin);

export default mongoose.model<IInAppNotification, SoftDeleteModel<IInAppNotification>>(
  'InAppNotification',
  InAppNotificationSchema,
);
