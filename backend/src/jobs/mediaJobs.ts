import { mediaQueue } from './queues';
import logger from '../config/logger';

/**
 * Dispatches a job to the mediaQueue for asynchronous processing.
 */
export const enqueueMediaJob = async (jobType: string, data: any, options?: any): Promise<void> => {
  if (!mediaQueue) {
    logger.warn(`[MediaJobs] mediaQueue not initialized, unable to dispatch ${jobType}`);
    return;
  }

  try {
    await mediaQueue.add(jobType, data, options);
    logger.debug(
      `[MediaJobs] Enqueued ${jobType} job for media ${data.mediaId || data.oldPublicId || ''}`,
    );
  } catch (error: any) {
    logger.error(`[MediaJobs] Failed to enqueue ${jobType}: ${error.message}`);
  }
};
