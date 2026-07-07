import path from 'path';
import fs from 'fs';

import { StorageProviderType } from '../../models/BackupRecord';
import logger from '../../config/logger';
import crypto from 'crypto';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  immutable?: boolean;
  retainUntil?: Date;
}

export interface UploadResult {
  location: string;
  sizeBytes: number;
  checksum: string; // post-upload verify if possible
}

export interface RemoteFile {
  name: string;
  path: string;
  sizeBytes: number;
  lastModified: Date;
}

export interface StorageProvider {
  name: string;
  type: StorageProviderType;
  region: string;
  upload(filePath: string, remotePath: string, options?: UploadOptions): Promise<UploadResult>;
  uploadChunked?(
    filePath: string,
    remotePath: string,
    chunkSizeMB: number,
    resumeFromChunk?: number,
  ): Promise<UploadResult>;
  download(remotePath: string, localPath: string): Promise<void>;
  verify(remotePath: string, expectedChecksum: string): Promise<boolean>;
  delete(remotePath: string): Promise<void>;
  list(prefix: string): Promise<RemoteFile[]>;
  getSignedUrl?(remotePath: string, expiresInSeconds: number): Promise<string>;
  setImmutable?(remotePath: string, retainUntil: Date): Promise<void>;
}

// -----------------------------------------------------------------------------
// LOCAL STORAGE PROVIDER
// -----------------------------------------------------------------------------
export class LocalStorageProvider implements StorageProvider {
  public name = 'local-storage';
  public type: StorageProviderType = 'local';
  public region = 'local';

  private basePath: string;

  constructor(basePath: string = path.join(process.cwd(), 'backups')) {
    this.basePath = basePath;
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(
    filePath: string,
    remotePath: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const dest = path.join(this.basePath, remotePath);
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Usually, filePath is already local. So we just copy it.
    if (filePath !== dest) {
      await fs.promises.copyFile(filePath, dest);
    }

    const stat = await fs.promises.stat(dest);

    // In local, we just hash the file again to return a checksum
    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(dest);
    for await (const chunk of rs) {
      hash.update(chunk);
    }

    if (options?.immutable) {
      // Very basic local immutability: read-only permissions
      await fs.promises.chmod(dest, 0o444);
    }

    return {
      location: dest,
      sizeBytes: stat.size,
      checksum: hash.digest('hex'),
    };
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    const src = path.join(this.basePath, remotePath);
    await fs.promises.copyFile(src, localPath);
  }

  async verify(remotePath: string, expectedChecksum: string): Promise<boolean> {
    const src = path.join(this.basePath, remotePath);
    if (!fs.existsSync(src)) return false;

    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(src);
    for await (const chunk of rs) {
      hash.update(chunk);
    }
    return hash.digest('hex') === expectedChecksum;
  }

  async delete(remotePath: string): Promise<void> {
    const target = path.join(this.basePath, remotePath);
    if (fs.existsSync(target)) {
      // Need to chmod back to writeable if it was immutable
      try {
        await fs.promises.chmod(target, 0o666);
      } catch (_e) {}
      await fs.promises.unlink(target);
    }
  }

  async list(prefix: string): Promise<RemoteFile[]> {
    const targetDir = path.join(this.basePath, prefix);
    if (!fs.existsSync(targetDir)) return [];

    const files = await fs.promises.readdir(targetDir);
    const result: RemoteFile[] = [];

    for (const file of files) {
      const fullPath = path.join(targetDir, file);
      const stat = await fs.promises.stat(fullPath);
      if (stat.isFile()) {
        result.push({
          name: file,
          path: path.join(prefix, file).replace(/\\/g, '/'),
          sizeBytes: stat.size,
          lastModified: stat.mtime,
        });
      }
    }
    return result;
  }

  async setImmutable(remotePath: string, _retainUntil: Date): Promise<void> {
    const dest = path.join(this.basePath, remotePath);
    if (fs.existsSync(dest)) {
      await fs.promises.chmod(dest, 0o444);
      // We could store the retainUntil in a separate metadata file locally if needed
    }
  }
}

// -----------------------------------------------------------------------------
// AWS S3 STORAGE PROVIDER (MOCK IMPLEMENTATION FOR PLAN)
// -----------------------------------------------------------------------------
export class S3StorageProvider implements StorageProvider {
  public name: string;
  public type: StorageProviderType = 's3';
  public region: string;
  private bucket: string;

  constructor(region: string, bucket: string) {
    this.region = region;
    this.name = `s3-${region}`;
    this.bucket = bucket;
    // AWS SDK init goes here
  }

  async upload(
    filePath: string,
    remotePath: string,
    _options?: UploadOptions,
  ): Promise<UploadResult> {
    logger.info(`[S3] Uploading ${filePath} to s3://${this.bucket}/${remotePath} (${this.region})`);
    // Implement standard S3 PutObject or parallel upload here
    // If options.immutable is true, set ObjectRetention
    return {
      location: `s3://${this.bucket}/${remotePath}`,
      sizeBytes: fs.statSync(filePath).size,
      checksum: 'mock-s3-hash-placeholder', // Would use ETag or x-amz-checksum-sha256
    };
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    logger.info(`[S3] Downloading s3://${this.bucket}/${remotePath} to ${localPath}`);
  }

  async verify(_remotePath: string, _expectedChecksum: string): Promise<boolean> {
    return true; // Use HeadObject to get checksum
  }

  async delete(remotePath: string): Promise<void> {
    logger.info(`[S3] Deleting s3://${this.bucket}/${remotePath}`);
  }

  async list(_prefix: string): Promise<RemoteFile[]> {
    return [];
  }

  async setImmutable(remotePath: string, retainUntil: Date): Promise<void> {
    logger.info(
      `[S3] Setting object lock on s3://${this.bucket}/${remotePath} until ${retainUntil.toISOString()}`,
    );
  }
}

// -----------------------------------------------------------------------------
// STORAGE MANAGER
// -----------------------------------------------------------------------------
export class StorageManager {
  private providers: StorageProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // 1. Local Storage
    this.providers.push(new LocalStorageProvider());

    // 2. S3 Regions
    const s3Bucket = process.env.BACKUP_S3_BUCKET;
    const s3Regions = process.env.BACKUP_S3_REGIONS?.split(',') || [];

    if (s3Bucket && s3Regions.length > 0) {
      for (const region of s3Regions) {
        this.providers.push(new S3StorageProvider(region.trim(), s3Bucket));
      }
    }

    // 3. Add GitHub / Cloudinary here following the same pattern
  }

  public getProviders(): StorageProvider[] {
    return this.providers;
  }

  public getProviderByName(name: string): StorageProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  /**
   * Heatmap visualization data
   */
  public async getStorageHeatMap(): Promise<any> {
    // Collect sizes from all providers based on their lists
    const providerStats = await Promise.all(
      this.providers.map(async (p) => {
        let usedBytes = 0;
        try {
          const files = await p.list('');
          usedBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
        } catch (_e) {
          // Ignore errors during heatmap generation
        }
        return {
          provider: p.name,
          usedBytes: usedBytes || 0,
          capacity: 1024 * 1024 * 1024 * 1000, // Fixed 1TB theoretical capacity
          utilization: (usedBytes || 0) / (1024 * 1024 * 1024 * 1000),
          region: p.region,
        };
      }),
    );

    return {
      byProvider: providerStats.map((s) => ({
        provider: s.provider,
        usedBytes: s.usedBytes,
        capacity: s.capacity,
        utilization: s.utilization,
      })),
      byRegion: providerStats.map((s) => ({
        region: s.region,
        usedBytes: s.usedBytes,
        backupCount: 1, // Need actual counts for more precision
      })),
      byMonth: [],
      byType: [],
    };
  }
}

export default new StorageManager();
