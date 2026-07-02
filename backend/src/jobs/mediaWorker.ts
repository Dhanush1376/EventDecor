import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import logger from '../config/logger';
import Media from '../models/Media';
import { CloudinaryAdapter } from '../services/media/CloudinaryAdapter';

export const createMediaWorker = (connection: Redis) => {
  const worker = new Worker(
    'mediaQueue',
    async (job: Job) => {
      logger.info(`[MediaWorker] Processing job ${job.id} of type ${job.name}`);

      try {
        switch (job.name) {
          case 'process-thumbnails': {
            // Thumbnails are handled eagerly during upload now, but this hook remains for future
            // async generation (e.g., if we decide to generate multiple resolutions via worker)
            logger.info(`[MediaWorker] Skipping process-thumbnails for now (handled eagerly)`);
            break;
          }
          case 'extract-metadata': {
            // Future AI metadata extraction or color extraction hook
            break;
          }
          case 'delete-old-version': {
            const { oldPublicId } = job.data;
            if (!oldPublicId) throw new Error('Missing oldPublicId');
            logger.info(`[MediaWorker] Deleting old version ${oldPublicId}`);
            await CloudinaryAdapter.delete(oldPublicId);
            break;
          }
          case 'permanent-delete': {
            const { mediaId } = job.data;
            if (!mediaId) throw new Error('Missing mediaId');

            const media = await (Media as any).findOneWithDeleted({ _id: mediaId });
            if (!media) {
              logger.warn(`[MediaWorker] Media ${mediaId} not found for permanent deletion`);
              return;
            }

            if (media.status !== 'pending_delete') {
              logger.warn(
                `[MediaWorker] Media ${mediaId} is not in pending_delete state. Skipping.`,
              );
              return;
            }

            logger.info(`[MediaWorker] Permanently deleting media ${mediaId} from Cloudinary`);
            await CloudinaryAdapter.delete(media.publicId, media.resourceType);

            logger.info(`[MediaWorker] Removing media ${mediaId} from database`);
            await Media.deleteOne({ _id: mediaId });
            break;
          }
          case 'upload-single': {
            // For bulk upload queue processing
            break;
          }
          default:
            logger.warn(`[MediaWorker] Unknown job type: ${job.name}`);
        }
      } catch (error: any) {
        logger.error(`[MediaWorker] Job ${job.id} (${job.name}) failed: ${error.message}`);
        throw error; // Will trigger BullMQ retry mechanism
      }
    },
    { connection: connection as any, concurrency: 5 },
  );

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[MediaWorker] Job ${job?.id} failed after retries: ${err.message}`);
  });

  return worker;
};
