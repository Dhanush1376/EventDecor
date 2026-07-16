import { Worker } from 'bullmq';
import { connection as redisConnection } from './queues';
import { WhatsAppAutomationEngine } from '../domains/notifications/whatsapp/WhatsAppAutomationEngine';
import { WhatsAppRetryService } from '../domains/notifications/whatsapp/WhatsAppRetryService';
import { MediaAttachmentService } from '../domains/notifications/whatsapp/MediaAttachmentService';
import { WhatsAppCampaignService } from '../domains/notifications/whatsapp/WhatsAppCampaignService';
import { WhatsAppEscalationService } from '../domains/notifications/whatsapp/WhatsAppEscalationService';
import logger from '../config/logger';

// 1. Dispatch Worker - processes immediate sends
export const whatsappDispatchWorker = new Worker(
  'whatsapp-dispatch',
  async (job) => {
    if (job.name === 'dispatch-whatsapp-campaign') {
      await WhatsAppCampaignService.processCampaignMessage(job);
    } else {
      await WhatsAppAutomationEngine.process(job);
    }
  },
  {
    connection: redisConnection as any,
    concurrency: parseInt(process.env.WA_DISPATCH_CONCURRENCY || '5', 10), // Higher concurrency for instant dispatch
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
    concurrency: parseInt(process.env.WA_RETRY_CONCURRENCY || '2', 10),
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
    concurrency: parseInt(process.env.WA_MEDIA_CONCURRENCY || '3', 10),
  },
);

// 4. Escalation Worker - handles delayed read-receipt checks
export const whatsappEscalationWorker = new Worker(
  'whatsapp-escalation',
  async (job) => {
    await WhatsAppEscalationService.processEscalation(job);
  },
  {
    connection: redisConnection as any,
    concurrency: parseInt(process.env.WA_ESCALATION_CONCURRENCY || '2', 10),
  },
);

// 5. Campaign Batch Worker - processes campaigns iteratively
export const whatsappCampaignBatchWorker = new Worker(
  'whatsapp-campaign-batch',
  async (job) => {
    // Requires WhatsAppCampaignService but to avoid circular import during init, dynamic import is used inside the service or we just call it.
    // For clean architecture we can require it here.
    const {
      WhatsAppCampaignService,
    } = require('../domains/notifications/whatsapp/WhatsAppCampaignService');
    await WhatsAppCampaignService.processCampaignBatch(job);
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // High concurrency since it's just coordinating dispatch, not doing heavy lifting
  },
);
