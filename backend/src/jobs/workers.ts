import { Worker, Job } from 'bullmq';
import { connection } from './queues';
import logger from '../config/logger';
import { sendDirectEmail } from '../services/notificationService';


// Email Worker
export const emailWorker = new Worker(
  'emailQueue',
  async (job: Job) => {
    logger.info(`[WORKER] Processing email job ${job.id} for ${job.data.to}`);
    await sendDirectEmail({
      email: job.data.to,
      subject: job.data.subject,
      customHtml: job.data.html,
      type: 'system',
      action: 'background_email'
    });
  },
  { connection }
);

emailWorker.on('completed', (job) => logger.info(`[WORKER] Email job ${job.id} completed.`));
emailWorker.on('failed', (job, err) => logger.error(`[WORKER] Email job ${job?.id} failed:`, err));
emailWorker.on('error', (err: any) => {
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
  logger.error(`[WORKER email] Error:`, err);
});

// Notification Worker (placeholder for push/SMS)
export const notificationWorker = new Worker(
  'notificationQueue',
  async (job: Job) => {
    logger.info(`[WORKER] Processing notification job ${job.id}`);
    // Future integration
  },
  { connection }
);

notificationWorker.on('error', (err: any) => {
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
  logger.error(`[WORKER notification] Error:`, err);
});

// Loyalty Worker (placeholder for loyalty points assignment)
export const loyaltyWorker = new Worker(
  'loyaltyQueue',
  async (job: Job) => {
    logger.info(`[WORKER] Processing loyalty job ${job.id} for user ${job.data.userId}`);
    // Future integration
  },
  { connection }
);

loyaltyWorker.on('error', (err: any) => {
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
  logger.error(`[WORKER loyalty] Error:`, err);
});

export const closeWorkers = async () => {
  await emailWorker.close();
  await notificationWorker.close();
  await loyaltyWorker.close();
};
