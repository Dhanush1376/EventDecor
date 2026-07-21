import mongoose, { Schema, Document } from 'mongoose';
import storeSettingsService from '../services/StoreSettingsService';
export interface INotificationLog extends Document {
  userId?: mongoose.Types.ObjectId;
  recipientEmail: string;
  campaignId?: mongoose.Types.ObjectId;
  type: 'marketing' | 'order' | 'account' | 'engagement' | 'system' | 'security';
  channel: 'email' | 'sms' | 'push' | 'websocket';
  action: string; // e.g. welcome_email, otp_verification, order_placed, abandoned_cart
  status:
    | 'queued'
    | 'pending'
    | 'processing'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'clicked'
    | 'failed'
    | 'dead_letter'
    | 'cancelled'
    | 'retried';
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
  sender: string;
  templateName?: string;
  bounce?: boolean;
  spam?: boolean;
  spamReportedAt?: Date;
  bouncedAt?: Date;
  failureReason?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  sendTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
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
      enum: [
        'queued',
        'pending',
        'processing',
        'sent',
        'delivered',
        'read',
        'clicked',
        'failed',
        'dead_letter',
        'cancelled',
        'retried',
      ],
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
    sender: { type: String, default: 'system@siriarts.in' },
    templateName: { type: String },
    bounce: { type: Boolean, default: false },
    bouncedAt: { type: Date },
    spam: { type: Boolean, default: false },
    spamReportedAt: { type: Date },
    failureReason: { type: String },
    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },
    sendTime: { type: Date },
    expiresAt: { type: Date },
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

// TTL: Auto-cleanup notification logs dynamically
NotificationLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

NotificationLogSchema.pre('save', async function () {
  if (this.isNew || this.isModified('status')) {
    try {
      const settings = await storeSettingsService.getSettings();
      const defaultDays = settings.retentionPolicies?.notificationLogsDays || 14;
      const days = this.status === 'failed' ? 30 : defaultDays;
      this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } catch (_err) {
      this.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }
  }
});

NotificationLogSchema.pre('findOneAndUpdate', async function () {
  const update: any = this.getUpdate();
  const status = update?.status || update?.$set?.status;

  if (status) {
    try {
      const settings = await storeSettingsService.getSettings();
      const defaultDays = settings.retentionPolicies?.notificationLogsDays || 14;
      const days = status === 'failed' ? 30 : defaultDays;

      if (update.$set) {
        update.$set.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      } else {
        update.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    } catch (_err) {}
  }
});

const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);

export default NotificationLog;
