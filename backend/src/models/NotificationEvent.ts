import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationEvent extends Document {
  notificationKey: string;
  eventType: string;
  aggregateId?: mongoose.Types.ObjectId;
  recipientGroup: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  providerMessageId?: string;
  sentAt?: Date;
  errorLog?: string;
}

const NotificationEventSchema: Schema = new Schema(
  {
    notificationKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    aggregateId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    recipientGroup: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'sent', 'failed'],
      default: 'queued',
      required: true,
    },
    providerMessageId: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
    errorLog: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically prune extremely old notification records if desired,
// though keeping them ensures idempotency forever. Let's keep them forever (or prune after 1 year).
NotificationEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model<INotificationEvent>('NotificationEvent', NotificationEventSchema);
