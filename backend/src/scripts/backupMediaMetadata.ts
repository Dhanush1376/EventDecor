import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import Media from '../models/Media';
import logger from '../config/logger';

/**
 * Backup Script: Exports the Media collection metadata to a JSON file.
 * Useful for disaster recovery of the Central Media Registry state.
 */
const backupMediaMetadata = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info('[BackupMedia] Connected to MongoDB');

    const allMedia = await (Media as any).findWithDeleted({}).lean().exec();

    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `media-metadata-${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(allMedia, null, 2));

    logger.info(
      `[BackupMedia] Successfully backed up ${allMedia.length} media records to ${backupFile}`,
    );
  } catch (error) {
    logger.error('[BackupMedia] Backup failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

backupMediaMetadata();
