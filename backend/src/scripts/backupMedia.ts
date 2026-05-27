import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Cloudinary Media Backup Script
 * 
 * Fetches all assets from Cloudinary and downloads them locally.
 * Can be run on a cron schedule and synced to AWS S3.
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BACKUP_DIR = path.resolve(__dirname, '../../backups/media');

const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

export const runMediaBackup = async () => {
  logger.info('[MEDIA BACKUP] Starting Cloudinary media sync...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  try {
    let nextCursor = undefined;
    let totalDownloaded = 0;

    // Paginate through all Cloudinary resources
    do {
      const result: any = await cloudinary.api.resources({
        type: 'upload',
        max_results: 100,
        next_cursor: nextCursor,
      });

      const resources = result.resources || [];
      
      for (const asset of resources) {
        const ext = asset.format || 'jpg';
        const filename = `${asset.public_id.replace(/\//g, '_')}.${ext}`;
        const destPath = path.join(BACKUP_DIR, filename);

        // Skip if we already have it downloaded
        if (fs.existsSync(destPath)) {
          continue;
        }

        try {
          await downloadFile(asset.secure_url, destPath);
          totalDownloaded++;
          logger.debug(`[MEDIA BACKUP] Downloaded: ${filename}`);
        } catch (err: any) {
          logger.error(`[MEDIA BACKUP] Failed to download ${filename}: ${err.message}`);
        }
      }

      nextCursor = result.next_cursor;
    } while (nextCursor);

    logger.info(`[MEDIA BACKUP] Sync complete. Downloaded ${totalDownloaded} new assets.`);
    logger.info(`[MEDIA BACKUP] Assets stored at: ${BACKUP_DIR}`);
    logger.info(`[MEDIA BACKUP] Tip: Use AWS CLI to sync this directory to S3: aws s3 sync ${BACKUP_DIR} s3://your-bucket/media/`);

  } catch (error: any) {
    logger.error(`[MEDIA BACKUP] Cloudinary API Error: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  runMediaBackup().then(() => process.exit(0));
}
