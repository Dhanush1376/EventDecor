import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { IBackupRecord } from '../../models/BackupRecord';
import { CompressionService } from './CompressionService';
import { EncryptionService } from './EncryptionService';

const streamPipeline = promisify(pipeline);

export interface BackupManifest {
  backupId: string;
  timestamp: string;
  type: string;
  schedule: string;
  collections: {
    name: string;
    count: number;
    sha256?: string;
  }[];
  schemaVersion?: string;
  appVersion?: string;
  commitSha?: string;
  nodeVersion: string;
  mongoVersion?: string;
  compressionAlgorithm: string;
  encryptionAlgorithm: string;
  totalRecords: number;
  totalSizeBytes?: number;
  restoreInstructions: string[];
  signatureHex?: string;
}

export class BackupExecutor {
  /**
   * Streams a MongoDB collection to a file, applying compression and encryption on the fly.
   */
  public static async streamCollection(
    collectionName: string,
    outputPath: string,
    sinceTimestamp?: Date,
  ): Promise<{ recordCount: number; sizeBytes: number; sha256: string }> {
    // We will use mongoose connection directly to avoid schema issues if a model isn't registered
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection is not established');

    const collection = db.collection(collectionName);
    const query = sinceTimestamp ? { updatedAt: { $gt: sinceTimestamp } } : {};

    const cursor = collection.find(query).batchSize(500); // Prevents OOM

    // Determine compression
    const compressionStrategy = CompressionService.selectStrategy(null, 'application/json');
    const compressStream = CompressionService.createCompressStream(compressionStrategy);

    // Determine encryption
    const { stream: encryptStream } = await EncryptionService.createEncryptStream();

    // We need to calculate size and sha256 of the *final encrypted* output to verify the upload
    // Also we need to count records
    let recordCount = 0;

    // Transform stream: Document -> JSON String -> Buffer
    const jsonTransform = new (require('stream').Transform)({
      objectMode: true,
      transform(doc: any, encoding: string, callback: any) {
        if (recordCount === 0) {
          this.push('['); // Start JSON array
        } else {
          this.push(',');
        }
        this.push(JSON.stringify(doc));
        recordCount++;
        callback();
      },
      flush(callback: any) {
        if (recordCount === 0) {
          this.push('[');
        }
        this.push(']'); // End JSON array
        callback();
      },
    });

    const fileWriteStream = fs.createWriteStream(outputPath);
    const hash = crypto.createHash('sha256');

    // To hash the data going into the file, we can use a pass-through stream
    const hashStream = new (require('stream').PassThrough)();
    hashStream.on('data', (chunk: Buffer) => hash.update(chunk));

    // Execute pipeline:
    // Mongoose Cursor -> jsonTransform -> compressStream -> encryptStream -> hashStream -> fileWriteStream
    const pipelineStreams: any[] = [cursor.stream(), jsonTransform];
    if (compressStream) pipelineStreams.push(compressStream);
    pipelineStreams.push(encryptStream);
    pipelineStreams.push(hashStream);
    pipelineStreams.push(fileWriteStream);

    await streamPipeline(pipelineStreams as any);

    const stat = await fs.promises.stat(outputPath);

    return {
      recordCount,
      sizeBytes: stat.size,
      sha256: hash.digest('hex'),
    };
  }

  /**
   * Generates a manifest file for the backup archive
   */
  public static async generateManifest(
    record: IBackupRecord,
    workingDir: string,
  ): Promise<BackupManifest> {
    // Collect mongo version if possible
    let mongoVersion = 'unknown';
    try {
      const db = mongoose.connection.db;
      if (db) {
        const buildInfo = await db.admin().buildInfo();
        mongoVersion = buildInfo.version;
      }
    } catch (e) {}

    const manifest: BackupManifest = {
      backupId: record.backupId,
      timestamp: record.createdAt.toISOString(),
      type: record.type,
      schedule: record.schedule,
      collections: record.collections.map((c) => ({
        name: c.name,
        count: c.count,
        sha256: c.sha256,
      })),
      schemaVersion: record.versionInfo?.schemaVersion,
      appVersion: record.versionInfo?.appVersion,
      commitSha: record.versionInfo?.commitSha,
      nodeVersion: process.version,
      mongoVersion,
      compressionAlgorithm: 'gzip (smart)', // simplified for this example
      encryptionAlgorithm: 'aes-256-gcm',
      totalRecords: record.collections.reduce((acc, c) => acc + c.count, 0),
      totalSizeBytes: record.collections.reduce((acc, c) => acc + (c.sizeBytes || 0), 0),
      restoreInstructions: [
        '1. Ensure MongoDB is running and accessible',
        `2. Set BACKUP_ENCRYPTION_KEY to the key version (${record.encryption?.keyVersion || 'v1'}) indicated in this manifest`,
        '3. Decrypt: node scripts/decrypt-backup.js <archive>',
        '4. Decompress: gunzip <decrypted-archive>',
        '5. Restore: mongorestore --uri="<MONGO_URI>" <extracted-dir>',
        '6. Verify: node scripts/verify-restore.js',
      ],
    };

    // Calculate a hash of the manifest and sign it
    const manifestString = JSON.stringify(manifest, null, 2);
    const manifestHash = crypto.createHash('sha256').update(manifestString).digest('hex');
    const signature = EncryptionService.signBackup(manifestHash);

    manifest.signatureHex = signature.signatureHex;

    // Save manifest locally to be archived
    const manifestPath = path.join(workingDir, '_manifest.json');
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
  }

  /**
   * Packages environment variables and configs safely
   */
  public static async backupConfig(workingDir: string): Promise<void> {
    const configDir = path.join(workingDir, 'config');
    await fs.promises.mkdir(configDir, { recursive: true });

    // 1. Env vars (keys only or masked)
    const envKeys = Object.keys(process.env).sort();
    const envMasked = envKeys
      .map((k) => {
        // Don't mask standard safe vars, mask everything else
        if (k === 'NODE_ENV' || k === 'PORT') return `${k}=${process.env[k]}`;
        return `${k}=***MASKED***`;
      })
      .join('\n');
    await fs.promises.writeFile(path.join(configDir, 'env.masked'), envMasked);

    // 2. We would normally copy package.json, docker-compose.yml, etc. here
    // For this implementation plan, we'll just mock the file creation
    await fs.promises.writeFile(
      path.join(configDir, 'package.json.snapshot'),
      JSON.stringify({ name: 'eventdecor-snapshot' }),
    );
  }
}
