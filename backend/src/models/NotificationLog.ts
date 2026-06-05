import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationLog extends Document {
  userId?: mongoose.Types.ObjectId;
  recipientEmail: string;
  campaignId?: mongoose.Types.ObjectId;
  type: 'marketing' | 'order' | 'account' | 'engagement' | 'system' | 'security';
  channel: 'email' | 'sms' | 'push' | 'websocket';
  action: string; // e.g. welcome_email, otp_verification, order_placed, abandoned_cart
  status: 'queued' | 'pending' | 'sent' | 'delivered' | 'failed' | 'retried';
  scheduledAt?: Date;
  queuedAt?: Date;
  retryCount: number;
  errorDetails?: string;
  trackingToken: string;
  openedAt?: Date;
  clicks: Array<{
    url: string;
    clickedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'EmailCampaign' },
    type: {
      type: String,
      enum: ['marketing', 'order', 'account', 'engagement', 'system', 'security'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'websocket'],
      default: 'email',
    },
    action: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'pending', 'sent', 'delivered', 'failed', 'retried'],
      default: 'pending',
    },
    scheduledAt: { type: Date },
    queuedAt: { type: Date },
    retryCount: { type: Number, default: 0 },
    errorDetails: { type: String },
    trackingToken: { type: String, required: true, unique: true },
    openedAt: { type: Date },
    clicks: [
      {
        url: { type: String, required: true },
        clickedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

NotificationLogSchema.index({ recipientEmail: 1 });
NotificationLogSchema.index({ campaignId: 1 }, { sparse: true });
NotificationLogSchema.index({ type: 1 });
NotificationLogSchema.index({ createdAt: -1 });

// High-Performance Production Compound Indexes
NotificationLogSchema.index({ userId: 1, createdAt: -1 }, { sparse: true });
NotificationLogSchema.index({ status: 1, type: 1, createdAt: -1 });

// TTL: Auto-cleanup notification logs older than 90 days
NotificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);

export default NotificationLog;
