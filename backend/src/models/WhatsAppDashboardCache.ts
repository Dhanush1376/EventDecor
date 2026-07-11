import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppDashboardCache extends Document {
  date: string;
  messagesToday: number;
  messagesThisMonth: number;
  deliveryRate: number;
  failedMessages: number;
  pendingQueue: number;
  avgLatencyMs: number;
  lastSentAt?: Date;
  lastFailedAt?: Date;

  apiProvider: string;
  providerStatus: 'healthy' | 'degraded' | 'down';
  lastHealthCheck?: Date;

  automationStats: Map<
    string,
    {
      sent: number;
      delivered: number;
      failed: number;
      avgLatencyMs: number;
    }
  >;

  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppDashboardCacheSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
    messagesToday: { type: Number, default: 0 },
    messagesThisMonth: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 0 },
    failedMessages: { type: Number, default: 0 },
    pendingQueue: { type: Number, default: 0 },
    avgLatencyMs: { type: Number, default: 0 },
    lastSentAt: { type: Date },
    lastFailedAt: { type: Date },

    apiProvider: { type: String, default: 'meta_cloud' },
    providerStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'down'],
      default: 'healthy',
    },
    lastHealthCheck: { type: Date },

    automationStats: {
      type: Map,
      of: new Schema(
        {
          sent: { type: Number, default: 0 },
          delivered: { type: Number, default: 0 },
          failed: { type: Number, default: 0 },
          avgLatencyMs: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: {},
    },
  },
  { timestamps: true },
);

// Index is automatically created by unique: true on the date field

const WhatsAppDashboardCache = mongoose.model<IWhatsAppDashboardCache>(
  'WhatsAppDashboardCache',
  WhatsAppDashboardCacheSchema,
);
export default WhatsAppDashboardCache;
