import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from '../config/logger';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const execPromise = util.promisify(exec);

/**
 * MongoDB Offsite Backup Script
 *
 * Uses `mongodump` to create a BSON/JSON dump of the Atlas cluster.
 * Zips the dump and can be configured to push to an S3 bucket.
 *
 * Requirements:
 * - MongoDB Database Tools installed locally/on server (`mongodump` available in PATH)
 * - AWS CLI installed and configured (if pushing to S3)
 */

const MONGO_URI = process.env.MONGO_URI;
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'db');
const DATE_STR = new Date().toISOString().split('T')[0];
const ARCHIVE_NAME = `siri-arts-db-backup-${DATE_STR}.archive`;
const ARCHIVE_PATH = path.join(BACKUP_DIR, ARCHIVE_NAME);

// S3 Configuration (Optional)
const S3_BUCKET = process.env.S3_BACKUP_BUCKET; // e.g. "s3://siri-arts-backups/db/"

export const runDbBackup = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    logger.info(`[BACKUP] Starting MongoDB dump to ${ARCHIVE_PATH}...`);

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Run mongodump (creates a single compressed archive file)
    // Note: We use --gzip to save space
    const dumpCmd = `mongodump --uri="${MONGO_URI}" --archive="${ARCHIVE_PATH}" --gzip`;

    const { stdout, stderr } = await execPromise(dumpCmd);
    if (stderr && !stderr.includes('done dumping')) {
      logger.warn(`[BACKUP] mongodump stderr: ${stderr}`);
    }

    logger.info(`[BACKUP] Database dump successful. Saved to ${ARCHIVE_PATH}`);

    // Optional: Push to S3
    if (S3_BUCKET) {
      logger.info(`[BACKUP] Pushing archive to S3 bucket: ${S3_BUCKET}...`);
      const s3Cmd = `aws s3 cp "${ARCHIVE_PATH}" "${S3_BUCKET}${ARCHIVE_NAME}" --storage-class STANDARD_IA`;
      await execPromise(s3Cmd);
      logger.info(`[BACKUP] S3 upload complete.`);

      // Cleanup local file after successful upload to save disk space
      fs.unlinkSync(ARCHIVE_PATH);
      logger.info(`[BACKUP] Cleaned up local archive file.`);
    } else {
      logger.info('[BACKUP] S3_BACKUP_BUCKET not set. Skipping cloud upload.');
    }
  } catch (error: any) {
    logger.error(`[BACKUP] Database backup failed: ${error.message}`);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runDbBackup().then(() => process.exit(0));
}
