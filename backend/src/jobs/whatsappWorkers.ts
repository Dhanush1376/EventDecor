import { Worker } from 'bullmq';
import { connection as redisConnection } from './queues';
import { WhatsAppAutomationEngine } from '../domains/notifications/whatsapp/WhatsAppAutomationEngine';
import { WhatsAppRetryService } from '../domains/notifications/whatsapp/WhatsAppRetryService';
import { MediaAttachmentService } from '../domains/notifications/whatsapp/MediaAttachmentService';
import logger from '../config/logger';

// 1. Dispatch Worker - processes immediate sends
export const whatsappDispatchWorker = new Worker(
  'whatsapp-dispatch',
  async (job) => {
    await WhatsAppAutomationEngine.process(job);
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Higher concurrency for instant dispatch
  },
);

whatsappDispatchWorker.on('failed', (job, err) => {
  logger.error(`[WhatsAppDispatchWorker] Job ${job?.id} failed`, err);
  // Optional: trigger WhatsAppRetryService.scheduleRetry here if not handled inside process()
});

// 2. Retry Worker - processes backoff delayed sends
export const whatsappRetryWorker = new Worker(
  'whatsapp-retry',
  async (job) => {
    await WhatsAppRetryService.processRetry(job);
  },
  {
    connection: redisConnection as any,
    concurrency: 2,
  },
);

// 3. Media Worker - handles PDF/QR generation
export const whatsappMediaWorker = new Worker(
  'whatsapp-media',
  async (job) => {
    await MediaAttachmentService.processMediaJob(job);
  },
  {
    connection: redisConnection as any,
    concurrency: 3,
  },
);
