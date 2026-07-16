import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppWebhookLog extends Document {
  provider: string; // e.g. 'meta_cloud', 'twilio', 'gupshup'
  eventType: string; // e.g. 'message_status', 'messages'
  waMessageId?: string;
  status?: string; // e.g. 'sent', 'delivered', 'read', 'failed'

  timestamp: Date;
  rawPayload: any;

  signature?: string;
  signatureValid: boolean;

  isDuplicate: boolean;
  processedAt?: Date;
  processingError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppWebhookLogSchema = new Schema(
  {
    provider: { type: String, required: true },
    eventType: { type: String, required: true },
    waMessageId: { type: String },
    status: { type: String },

    timestamp: { type: Date, required: true },
    rawPayload: { type: Schema.Types.Mixed, required: true },

    signature: { type: String },
    signatureValid: { type: Boolean, default: false },

    isDuplicate: { type: Boolean, default: false },
    processedAt: { type: Date },
    processingError: { type: String },
  },
  { timestamps: true },
);

WhatsAppWebhookLogSchema.index({ waMessageId: 1, status: 1 });
WhatsAppWebhookLogSchema.index({ timestamp: 1 });
// TTL of 90 days for webhook logs
WhatsAppWebhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const WhatsAppWebhookLog = mongoose.model<IWhatsAppWebhookLog>(
  'WhatsAppWebhookLog',
  WhatsAppWebhookLogSchema,
);
export default WhatsAppWebhookLog;
