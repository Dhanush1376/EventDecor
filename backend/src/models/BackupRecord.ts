import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type BackupType =
  | 'full'
  | 'incremental'
  | 'differential'
  | 'snapshot'
  | 'emergency'
  | 'config';
export type BackupSchedule =
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'manual'
  | 'emergency';
export type BackupStatus =
  | 'preparing'
  | 'dumping'
  | 'compressing'
  | 'encrypting'
  | 'signing'
  | 'uploading'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'rolled_back';
export type StorageProviderType = 'local' | 'github' | 's3' | 'gcs' | 'azure' | 'cloudinary';

export interface IBackupCollection {
  name: string;
  count: number;
  sha256?: string;
  sizeBytes?: number;
  lastDocumentTimestamp?: Date; // For PITR
}

export interface IPhaseTiming {
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface IStorageProviderInfo {
  provider: StorageProviderType;
  region?: string;
  location: string;
  verified: boolean;
  uploadedAt?: Date;
  chunksTotal?: number;
  chunksCompleted?: number;
}

export interface IBackupRecord extends Document {
  backupId: string;
  type: BackupType;
  schedule: BackupSchedule;
  status: BackupStatus;

  collections: IBackupCollection[];

  metrics: {
    durationMs?: number;
    sizeRaw?: number;
    sizeCompressed?: number;
    sizeEncrypted?: number;
    compressionRatio?: number;
    throughputBytesPerSec?: number;
    cpuPeakPercent?: number;
    memoryPeakMB?: number;
    encryptionDurationMs?: number;
    compressionDurationMs?: number;
    uploadDurationMs?: number;
    verificationDurationMs?: number;
    signingDurationMs?: number;
    phaseTimings?: Record<string, IPhaseTiming>;
  };

  encryption?: {
    algorithm: string;
    keyVersion: string;
    iv?: string;
    authTag?: string;
  };

  signature?: {
    algorithm: string;
    publicKeyId: string;
    signatureHex: string;
    signedAt: Date;
  };

  storage: IStorageProviderInfo[];

  checksum?: {
    sha256PreUpload?: string;
    sha256PostUpload?: string;
  };

  verification?: {
    passed: boolean;
    checkedAt?: Date;
    issues?: string[];
  };

  retentionPolicy: string;
  expiresAt?: Date;
  immutable: boolean;
  integrityScore?: number;

  versionInfo?: {
    appVersion?: string;
    nodeVersion?: string;
    mongoVersion?: string;
    schemaVersion?: string;
    migrationVersion?: string;
    apiVersion?: string;
    commitSha?: string;
    gitTag?: string;
    buildTimestamp?: Date;
  };

  pitrChain?: string; // Reference to previous backupId

  manifest?: any; // Embedded JSON manifest
  rollbackSnapshotId?: string;

  metadata?: {
    environment?: string;
    hostname?: string;
    triggerSource?: string;
    [key: string]: any;
  };

  createdAt: Date;
  updatedAt: Date;
}

const BackupRecordSchema = new Schema<IBackupRecord>(
  {
    backupId: { type: String, required: true, unique: true, default: () => crypto.randomUUID() },
    type: {
      type: String,
      required: true,
      enum: ['full', 'incremental', 'differential', 'snapshot', 'emergency', 'config'],
    },
    schedule: {
      type: String,
      required: true,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'manual', 'emergency'],
    },
    status: {
      type: String,
      required: true,
      enum: [
        'preparing',
        'dumping',
        'compressing',
        'encrypting',
        'signing',
        'uploading',
        'verifying',
        'completed',
        'failed',
        'rolled_back',
      ],
      default: 'preparing',
    },

    collections: [
      {
        name: { type: String, required: true },
        count: { type: Number, required: true },
        sha256: { type: String },
        sizeBytes: { type: Number },
        lastDocumentTimestamp: { type: Date },
      },
    ],

    metrics: {
      durationMs: { type: Number },
      sizeRaw: { type: Number },
      sizeCompressed: { type: Number },
      sizeEncrypted: { type: Number },
      compressionRatio: { type: Number },
      throughputBytesPerSec: { type: Number },
      cpuPeakPercent: { type: Number },
      memoryPeakMB: { type: Number },
      encryptionDurationMs: { type: Number },
      compressionDurationMs: { type: Number },
      uploadDurationMs: { type: Number },
      verificationDurationMs: { type: Number },
      signingDurationMs: { type: Number },
      phaseTimings: { type: Schema.Types.Mixed, default: {} },
    },

    encryption: {
      algorithm: { type: String },
      keyVersion: { type: String },
      iv: { type: String },
      authTag: { type: String },
    },

    signature: {
      algorithm: { type: String },
      publicKeyId: { type: String },
      signatureHex: { type: String },
      signedAt: { type: Date },
    },

    storage: [
      {
        provider: { type: String, required: true },
        region: { type: String },
        location: { type: String, required: true },
        verified: { type: Boolean, default: false },
        uploadedAt: { type: Date },
        chunksTotal: { type: Number },
        chunksCompleted: { type: Number },
      },
    ],

    checksum: {
      sha256PreUpload: { type: String },
      sha256PostUpload: { type: String },
    },

    verification: {
      passed: { type: Boolean, default: false },
      checkedAt: { type: Date },
      issues: [{ type: String }],
    },

    retentionPolicy: { type: String },
    expiresAt: { type: Date },
    immutable: { type: Boolean, default: false },
    integrityScore: { type: Number },

    versionInfo: {
      appVersion: { type: String },
      nodeVersion: { type: String },
      mongoVersion: { type: String },
      schemaVersion: { type: String },
      migrationVersion: { type: String },
      apiVersion: { type: String },
      commitSha: { type: String },
      gitTag: { type: String },
      buildTimestamp: { type: Date },
    },

    pitrChain: { type: String },
    manifest: { type: Schema.Types.Mixed },
    rollbackSnapshotId: { type: String },

    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

BackupRecordSchema.index({ type: 1, status: 1, createdAt: -1 });
BackupRecordSchema.index({ 'versionInfo.commitSha': 1 });
BackupRecordSchema.index({ pitrChain: 1 });
BackupRecordSchema.index({ immutable: 1, expiresAt: 1 });

const BackupRecord =
  mongoose.models.BackupRecord || mongoose.model<IBackupRecord>('BackupRecord', BackupRecordSchema);
export default BackupRecord;
