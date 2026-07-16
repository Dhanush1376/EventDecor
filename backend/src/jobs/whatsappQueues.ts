import { Queue } from 'bullmq';
import { connection as redisConnection } from './queues';

// Immediate processing queue (latency < 5s target)
export const whatsappDispatchQueue = new Queue('whatsapp-dispatch', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 1, // Retry is handled by our WhatsAppRetryService, not BullMQ core
    removeOnComplete: 100,
    removeOnFail: false,
  },
});

// Delayed processing queue for retries
export const whatsappRetryQueue = new Queue('whatsapp-retry', {
  connection: redisConnection as any,
});

// Queue for generating heavy media attachments (PDFs/Images)
export const whatsappMediaQueue = new Queue('whatsapp-media', {
  connection: redisConnection as any,
});

// Queue for delayed escalation checks
export const whatsappEscalationQueue = new Queue('whatsapp-escalation', {
  connection: redisConnection as any,
});

// Queue for Campaign Batches (Cursor-based pagination)
export const whatsappCampaignBatchQueue = new Queue('whatsapp-campaign-batch', {
  connection: redisConnection as any,
});
