import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/emailQueue';
import { sendDirectEmailProcessor, EmailOptions } from '../services/notificationService';
import logger from '../config/logger';

// Process email jobs from the queue in the background
const emailWorker = new Worker('email-queue', async (job: Job) => {
  const options: EmailOptions = job.data;
  
  logger.info(`[EmailWorker] Processing job ${job.id} for ${options.email} (Type: ${options.type})`);
  
  try {
    await sendDirectEmailProcessor(options);
    logger.info(`[EmailWorker] Successfully completed job ${job.id}`);
  } catch (err: any) {
    logger.error(`[EmailWorker] Failed job ${job.id} for ${options.email}: ${err.message}`);
    throw err; // BullMQ will automatically retry based on queue settings
  }
}, { 
  connection: redisConnection,
  concurrency: 5 // Process 5 emails concurrently
});

emailWorker.on('failed', (job, err) => {
  logger.error(`[EmailWorker] Job ${job?.id} permanently failed after retries: ${err.message}`);
});

export default emailWorker;
