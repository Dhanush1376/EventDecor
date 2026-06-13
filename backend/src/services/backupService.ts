import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import logger from '../config/logger';

const execPromise = util.promisify(exec);

export class BackupService {
  private backupRoot: string;
  private maxRetries = 3;

  constructor() {
    this.backupRoot = path.resolve(__dirname, '../../../backups');
    try {
      if (!fs.existsSync(this.backupRoot)) {
        fs.mkdirSync(this.backupRoot, { recursive: true });
      }
    } catch (err: any) {
      logger.warn(
        `[BackupService] Failed to create backup root at ${this.backupRoot}: ${err.message}. Falling back to /tmp/backups`,
      );
      this.backupRoot = '/tmp/backups';
      try {
        if (!fs.existsSync(this.backupRoot)) {
          fs.mkdirSync(this.backupRoot, { recursive: true });
        }
      } catch (fallbackErr: any) {
        logger.error(
          `[BackupService] Failed to create fallback backup root: ${fallbackErr.message}`,
        );
      }
    }
  }

  /**
   * Performs a JSON backup of critical collections
   */
  public async createJsonBackup(type: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<string> {
    logger.info(`[BackupService] Starting ${type} JSON backup...`);
    const dateStr = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.backupRoot, type, dateStr);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const collectionsToBackup = [
      'products',
      'users',
      'orders',
      'inventoryledgers',
      'inventoryreservations',
      'categories',
      'reviews',
      'customorders',
    ];

    for (const collectionName of collectionsToBackup) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        const data = await collection.find({}).toArray();
        const filePath = path.join(targetDir, `${collectionName}.json`);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        logger.info(`[BackupService] JSON exported ${data.length} records for ${collectionName}`);
      } catch (err: any) {
        logger.error(`[BackupService] Failed to export JSON for ${collectionName}: ${err.message}`);
      }
    }

    logger.info(`[BackupService] ${type} JSON backup completed at ${targetDir}`);

    // Trigger GitHub Offsite Backup
    await this.pushToGithub(targetDir, type);

    return targetDir;
  }

  /**
   * Pushes the generated JSON files to a private GitHub repository via REST API
   * Survives ephemeral deployments by providing a durable offsite copy
   */
  public async pushToGithub(backupDir: string, type: string): Promise<void> {
    const owner = process.env.GITHUB_BACKUP_OWNER;
    const repo = process.env.GITHUB_BACKUP_REPO;
    const token = process.env.GITHUB_BACKUP_TOKEN;

    if (!owner || !repo || !token) {
      logger.warn(
        '[BackupService] GITHUB_BACKUP_OWNER, REPO, or TOKEN missing. Skipping GitHub offsite backup.',
      );
      return;
    }

    logger.info(`[BackupService] Pushing ${type} backups to GitHub (${owner}/${repo})...`);

    try {
      const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
      const dateStr = path.basename(backupDir); // e.g. "2026-06-07"

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const contentBase64 = Buffer.from(content).toString('base64');

        const githubPath = `${type}/${dateStr}/${file}`;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}`;

        // Node 18+ has native fetch
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Automated ${type} backup: ${dateStr} - ${file}`,
            content: contentBase64,
          }), // GitHub API creates on default branch if branch is not specified
        });

        if (!response.ok) {
          const errData = await response.text();
          logger.error(
            `[BackupService] GitHub API Error for ${file}: ${response.status} - ${errData}`,
          );
        } else {
          logger.debug(`[BackupService] Successfully pushed ${file} to GitHub.`);
        }
      }
      logger.info(`[BackupService] All JSON files pushed to GitHub offsite repository.`);
    } catch (err: any) {
      logger.error(`[BackupService] Failed to push to GitHub: ${err.message}`);
    }
  }

  /**
   * Performs a BSON backup using mongodump
   */
  public async createMongoDump(type: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<void> {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      logger.warn('[BackupService] MONGO_URI missing, skipping mongodump.');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.backupRoot, type, dateStr, 'mongodump');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    try {
      logger.info(`[BackupService] Starting mongodump (BSON) export...`);
      // We only dump critical collections to keep size manageable and focused
      const collections = ['products', 'users', 'orders', 'inventoryledgers', 'customorders'];

      for (const coll of collections) {
        logger.info(`[BackupService] Dumping ${coll}...`);
        await execPromise(`mongodump --uri="${uri}" --collection=${coll} --out="${targetDir}"`);
      }
      logger.info(`[BackupService] mongodump completed successfully.`);
    } catch (err: any) {
      logger.warn(
        `[BackupService] mongodump failed: ${err.message}. Ensure MongoDB Database Tools are installed.`,
      );
    }
  }

  /**
   * Creates an emergency snapshot of all critical collections
   */
  public async createEmergencySnapshot(reason: string): Promise<string> {
    logger.warn(`[BackupService] 🚨 Triggering EMERGENCY snapshot. Reason: ${reason}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDir = path.join(this.backupRoot, 'emergency', timestamp);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, 'REASON.txt'), reason);

    const collections = ['products', 'users', 'orders', 'inventoryledgers', 'customorders'];

    for (const coll of collections) {
      try {
        const collection = mongoose.connection.collection(coll);
        const data = await collection.find({}).toArray();
        fs.writeFileSync(path.join(targetDir, `${coll}.json`), JSON.stringify(data, null, 2));
      } catch (e: any) {
        logger.error(`[BackupService] Emergency snapshot failed for ${coll}: ${e.message}`);
      }
    }
    logger.warn(`[BackupService] Emergency snapshot saved to ${targetDir}`);

    // Push to offsite repository immediately
    await this.pushToGithub(targetDir, 'emergency');

    return targetDir;
  }

  /**
   * Prunes old backups based on retention policy
   * Daily: 30 days
   * Weekly: 12 weeks
   * Monthly: 12 months
   */
  public async pruneOldBackups(): Promise<void> {
    logger.info('[BackupService] Starting retention pruning...');

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const policies = [
      { type: 'daily', maxAge: 30 * DAY_MS },
      { type: 'weekly', maxAge: 12 * 7 * DAY_MS },
      { type: 'monthly', maxAge: 365 * DAY_MS },
    ];

    for (const policy of policies) {
      const typeDir = path.join(this.backupRoot, policy.type);
      if (!fs.existsSync(typeDir)) continue;

      const folders = fs.readdirSync(typeDir);
      for (const folder of folders) {
        const folderPath = path.join(typeDir, folder);
        const stats = fs.statSync(folderPath);

        if (stats.isDirectory()) {
          const folderDate = new Date(folder).getTime();
          if (!isNaN(folderDate) && now - folderDate > policy.maxAge) {
            logger.info(`[BackupService] Pruning old ${policy.type} backup: ${folder}`);
            fs.rmSync(folderPath, { recursive: true, force: true });
          }
        }
      }
    }
    logger.info('[BackupService] Retention pruning completed.');
  }
}
