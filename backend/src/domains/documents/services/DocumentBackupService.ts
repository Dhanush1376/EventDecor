import OrderDocument from '../models/OrderDocument';
import logger from '../../../config/logger';
// Secondary (disaster-recovery) S3 client — a separate region/profile.
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';

const isDrConfigured = Boolean(
  process.env.DR_AWS_ACCESS_KEY_ID && process.env.DR_AWS_SECRET_ACCESS_KEY,
);

const drS3Client = new S3Client({
  region: process.env.DR_AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.DR_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.DR_AWS_SECRET_ACCESS_KEY || '',
  },
});

export class DocumentBackupService {
  /**
   * Syncs documents to a secondary Disaster Recovery S3 bucket.
   * This would typically be called by a cron job or an SQS queue worker.
   */
  static async syncToDisasterRecovery() {
    // Never mark documents as backed up unless a real DR copy can be performed —
    // a false "backed up" flag would hide gaps in disaster recovery coverage.
    if (!isDrConfigured) {
      logger.warn(
        '[DocumentBackupService] DR S3 credentials are not configured. Skipping disaster-recovery sync; documents remain flagged un-backed-up.',
      );
      return 0;
    }

    const batchSize = 100;
    const documents = await OrderDocument.find({ isBackedUp: false }).limit(batchSize);

    if (documents.length === 0) return 0;

    let successCount = 0;

    for (const doc of documents) {
      try {
        const sourceBucket = process.env.AWS_S3_BUCKET_NAME || 'siri-prod-bucket';
        const targetBucket = process.env.DR_AWS_S3_BUCKET_NAME || 'siri-dr-bucket';

        const command = new CopyObjectCommand({
          CopySource: `${sourceBucket}/${doc.s3Key}`,
          Bucket: targetBucket,
          Key: doc.s3Key,
        });

        await drS3Client.send(command);

        doc.isBackedUp = true;
        await doc.save();
        successCount++;
      } catch (err) {
        logger.error(`Failed to backup document ${doc._id} to DR bucket`, err);
      }
    }

    logger.info(`Backed up ${successCount} documents to DR bucket`);
    return successCount;
  }
}
