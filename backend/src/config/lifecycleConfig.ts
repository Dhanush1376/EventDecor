import process from 'process';
import './loadEnv'; // Ensure env is loaded

export const LifecycleConfig = {
  // Retention
  recycleBinRetentionDays: parseInt(process.env.RECYCLE_BIN_RETENTION_DAYS || '30'),
  pendingDeleteGracePeriodMs: parseInt(
    process.env.PENDING_DELETE_GRACE_MS || String(24 * 60 * 60 * 1000),
  ),
  auditLogRetentionDays: parseInt(process.env.CLEANUP_AUDIT_RETENTION_DAYS || '90'),

  // Retry
  maxRetryAttempts: parseInt(process.env.CLEANUP_MAX_RETRIES || '5'),
  retryBackoffBaseMs: parseInt(process.env.CLEANUP_RETRY_BACKOFF_MS || '30000'),
  retryBackoffType: (process.env.CLEANUP_RETRY_BACKOFF_TYPE || 'exponential') as
    | 'fixed'
    | 'exponential',

  // Batching & Throttling
  cloudinaryBatchSize: parseInt(process.env.CLOUDINARY_BATCH_SIZE || '50'),
  cloudinaryBatchDelayMs: parseInt(process.env.CLOUDINARY_BATCH_DELAY_MS || '1000'),
  integrityJobBatchSize: parseInt(process.env.INTEGRITY_BATCH_SIZE || '200'),
  orphanScanBatchSize: parseInt(process.env.ORPHAN_SCAN_BATCH_SIZE || '100'),

  // Performance Budget
  maxCleanupLatencyMs: parseInt(process.env.CLEANUP_MAX_LATENCY_MS || '500'),
  maxScanMemoryMb: parseInt(process.env.SCAN_MAX_MEMORY_MB || '256'),

  // Feature Flags
  enabled: process.env.ENABLE_ASSET_LIFECYCLE !== 'false',
  dryRun: process.env.ASSET_LIFECYCLE_DRY_RUN === 'true',
  enableBackgroundJobs: process.env.ENABLE_CRON !== 'false',

  // Ownership
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  trustedAssetPrefixes: (process.env.TRUSTED_ASSET_PREFIXES || 'res.cloudinary.com').split(','),
};
