import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppMessageLog extends Document {
  messageId: string;
  automationKey: string;
  automationName: string;

  recipientPhone: string;
  recipientName: string;
  recipientRole: string;

  templateId?: mongoose.Types.ObjectId;
  templateName: string;
  templateLayout: string;

  renderedMessage: string;
  messageType: 'template' | 'session' | 'media';

  attachments: Array<{
    type: 'invoice' | 'shipping_label' | 'packing_slip' | 'qr_code' | 'product_image';
    url: string;
    filename: string;
  }>;

  deliveryStatus: 'queued' | 'dispatched' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;

  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  failureReason?: string;

  apiProvider: string;
  apiResponse?: any;
  apiMessageId?: string;

  relatedEntityType?: 'order' | 'booking' | 'review' | 'inventory' | 'contact' | 'system';
  relatedEntityId?: mongoose.Types.ObjectId;

  idempotencyKey?: string;

  priority: string;
  triggeredBadges: string[];

  triggerTimestamp: Date;
  dispatchTimestamp?: Date;
  latencyMs?: number;

  timings?: {
    triggeredAt: Date;
    queuedAt?: Date;
    workerStartedAt?: Date;
    providerCalledAt?: Date;
    providerRespondedAt?: Date;
    deliveredAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageLogSchema = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    automationKey: { type: String, required: true },
    automationName: { type: String, required: true },

    recipientPhone: { type: String, required: true },
    recipientName: { type: String, required: true },
    recipientRole: { type: String, required: true },

    templateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    templateName: { type: String },
    templateLayout: { type: String },

    renderedMessage: { type: String, required: true },
    messageType: {
      type: String,
      enum: ['template', 'session', 'media'],
      default: 'template',
    },

    attachments: [
      {
        type: {
          type: String,
          enum: ['invoice', 'shipping_label', 'packing_slip', 'qr_code', 'product_image'],
        },
        url: { type: String },
        filename: { type: String },
      },
    ],

    deliveryStatus: {
      type: String,
      enum: ['queued', 'dispatched', 'sent', 'delivered', 'read', 'failed'],
      default: 'queued',
    },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },

    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 4 },
    nextRetryAt: { type: Date },
    failureReason: { type: String },

    apiProvider: { type: String, default: 'meta_cloud' },
    apiResponse: { type: Schema.Types.Mixed },
    apiMessageId: { type: String },

    relatedEntityType: {
      type: String,
      enum: ['order', 'booking', 'review', 'inventory', 'contact', 'system'],
    },
    relatedEntityId: { type: Schema.Types.ObjectId },

    idempotencyKey: { type: String, unique: true, sparse: true },

    priority: { type: String, default: 'normal' },
    triggeredBadges: [{ type: String }],

    triggerTimestamp: { type: Date, default: Date.now },
    dispatchTimestamp: { type: Date },
    latencyMs: { type: Number },
    timings: {
      triggeredAt: { type: Date, default: Date.now },
      queuedAt: { type: Date },
      workerStartedAt: { type: Date },
      providerCalledAt: { type: Date },
      providerRespondedAt: { type: Date },
      deliveredAt: { type: Date },
    },
  },
  { timestamps: true },
);

WhatsAppMessageLogSchema.index({ automationKey: 1, createdAt: -1 });
WhatsAppMessageLogSchema.index({ deliveryStatus: 1, createdAt: -1 });
WhatsAppMessageLogSchema.index({ recipientPhone: 1, createdAt: -1 });
WhatsAppMessageLogSchema.index({ relatedEntityId: 1, relatedEntityType: 1 });
WhatsAppMessageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 }); // 180 days TTL

const WhatsAppMessageLog = mongoose.model<IWhatsAppMessageLog>(
  'WhatsAppMessageLog',
  WhatsAppMessageLogSchema,
);
export default WhatsAppMessageLog;
