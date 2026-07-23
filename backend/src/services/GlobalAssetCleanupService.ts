import mongoose from 'mongoose';
import crypto from 'crypto';
import logger from '../config/logger';
import Media from '../models/Media';
import CleanupAuditLog from '../models/CleanupAuditLog';
import { StorageRegistry } from './storage';
import { DistributedLock } from '../utils/DistributedLock';
import { LifecycleConfig } from '../config/lifecycleConfig';
import { getRegisteredAssetFields } from '../utils/AssetLifecyclePlugin';
import { SNAPSHOT_MODELS, SKIP_MODELS } from '../utils/AssetLifecyclePlugin';

export class GlobalAssetCleanupService {
  /**
   * Generates an idempotency key for an operation.
   */
  private static generateDeduplicationKey(
    entityType: string,
    entityId: string,
    operation: string,
  ): string {
    const timeBucket = Math.floor(Date.now() / (1000 * 60 * 60)); // 1 hour bucket
    return crypto
      .createHash('sha256')
      .update(`${entityType}:${entityId}:${operation}:${timeBucket}`)
      .digest('hex');
  }

  /**
   * Dual-gate check to see if an asset is safe to delete.
   * Both gates must pass.
   */
  private static async isAssetSafeToDelete(
    url: string,
  ): Promise<{ safe: boolean; reason?: string }> {
    // Gate 1: Reference Count in Media document
    const media = await Media.findOne({ secureUrl: url });
    if (media && media.referenceCount > 0) {
      return { safe: false, reason: `refCount=${media.referenceCount}` };
    }

    // Gate 2: Live Document Verification
    for (const [modelName, Model] of Object.entries(mongoose.models)) {
      if (SNAPSHOT_MODELS?.has(modelName) || SKIP_MODELS?.has(modelName)) continue;
      if (modelName === 'Media' || modelName === 'CleanupAuditLog') continue;

      const assetFields = getRegisteredAssetFields(modelName);
      if (assetFields.length === 0) continue;

      const orConditions = assetFields.map((f) => ({ [f.path]: url }));
      const query: any = { $or: orConditions };

      // If the model supports soft-delete, exclude soft-deleted docs
      if (Model.schema.paths.isDeleted) {
        query.isDeleted = { $ne: true };
      }

      const count = await Model.collection.countDocuments(query);
      if (count > 0) {
        return { safe: false, reason: `Live ref in ${modelName}` };
      }
    }

    return { safe: true };
  }

  /**
   * Cleans assets that were replaced during an update operation.
   */
  static async cleanReplacedAssets(
    oldUrls: string[],
    newUrls: string[],
    context: { entityType: string; entityId: string; userId?: string },
  ) {
    if (!LifecycleConfig.enabled) return;

    const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));
    if (removedUrls.length === 0) return;

    const dedupKey = this.generateDeduplicationKey(context.entityType, context.entityId, 'update');

    // Idempotency check
    const existingLog = await CleanupAuditLog.findOne({ deduplicationKey: dedupKey });
    if (existingLog) {
      logger.info(
        `[CleanupService] Skipping idempotent update for ${context.entityType} ${context.entityId}`,
      );
      return;
    }

    const auditLog = new CleanupAuditLog({
      deduplicationKey: dedupKey,
      entityType: context.entityType,
      entityId: context.entityId,
      operation: 'update',
      initiatedBy: { type: 'plugin', userId: context.userId },
      status: 'partial',
    });

    await this.processDeletionBatch(removedUrls, auditLog);
  }

  /**
   * Cleans all assets for an entity (usually during a hard purge).
   */
  static async cleanAllAssets(
    urls: string[],
    context: { entityType: string; entityId: string; operation: string; userId?: string },
  ) {
    if (!LifecycleConfig.enabled || urls.length === 0) return;

    const dedupKey = this.generateDeduplicationKey(
      context.entityType,
      context.entityId,
      context.operation,
    );

    const existingLog = await CleanupAuditLog.findOne({ deduplicationKey: dedupKey });
    if (existingLog) {
      logger.info(
        `[CleanupService] Skipping idempotent ${context.operation} for ${context.entityType} ${context.entityId}`,
      );
      return;
    }

    const auditLog = new CleanupAuditLog({
      deduplicationKey: dedupKey,
      entityType: context.entityType,
      entityId: context.entityId,
      operation: context.operation,
      initiatedBy: { type: 'system', userId: context.userId },
      status: 'partial',
    });

    await this.processDeletionBatch(urls, auditLog);
  }

  private static async processDeletionBatch(urls: string[], auditLog: any) {
    const startTime = Date.now();
    let isFullySuccessful = true;

    for (const url of urls) {
      const provider = StorageRegistry.resolveProvider(url);
      if (!provider) {
        logger.warn(`[CleanupService] No provider for URL: ${url}`);
        auditLog.skippedAssets.push({ url, reason: 'No registered provider' });
        auditLog.assetsSkipped++;
        continue;
      }

      if (provider.isOwnedAsset && !provider.isOwnedAsset(url)) {
        logger.error(`[CleanupService] BLOCKED deletion of unowned asset: ${url}`);
        auditLog.skippedAssets.push({ url, reason: 'Ownership check failed' });
        auditLog.assetsSkipped++;
        continue;
      }

      const lockKey = `cleanup:${url}`; // lock by url or assetId
      await DistributedLock.withLock(
        lockKey,
        async () => {
          // Re-check gates inside lock
          const { safe, reason } = await this.isAssetSafeToDelete(url);
          if (!safe) {
            logger.info(`[CleanupService] Skipped ${url}: ${reason}`);
            auditLog.skippedAssets.push({ url, reason });
            auditLog.assetsSkipped++;
            return;
          }

          // Determine asset identifier
          const mediaDoc = await Media.findOne({ secureUrl: url });
          const assetId = mediaDoc ? mediaDoc.publicId : provider.extractAssetId?.(url);

          if (!assetId) {
            logger.error(`[CleanupService] Failed to extract asset ID for ${url}`);
            auditLog.failedAssets.push({ url, error: 'Cannot extract asset ID', willRetry: false });
            auditLog.assetsFailed++;
            isFullySuccessful = false;
            return;
          }

          if (LifecycleConfig.dryRun) {
            logger.info(`[CleanupService] DRY RUN: would delete ${assetId}`);
            auditLog.deletedAssets.push({
              url,
              publicId: assetId,
              provider: provider.constructor.name,
            });
            auditLog.assetsDeleted++;
          } else {
            try {
              const deleted = await provider.deleteFile(assetId);
              if (deleted) {
                auditLog.deletedAssets.push({
                  url,
                  publicId: assetId,
                  provider: provider.constructor.name,
                });
                auditLog.assetsDeleted++;

                // Keep Media doc in sync if it exists (or we can just delete it)
                if (mediaDoc) {
                  await Media.deleteOne({ _id: mediaDoc._id });
                }
              } else {
                auditLog.failedAssets.push({
                  url,
                  publicId: assetId,
                  error: 'Provider returned false',
                  willRetry: true,
                });
                auditLog.assetsFailed++;
                isFullySuccessful = false;
              }
            } catch (err: any) {
              logger.error(
                `[CleanupService] Provider deletion error for ${assetId}: ${err.message}`,
              );
              auditLog.failedAssets.push({
                url,
                publicId: assetId,
                error: err.message,
                willRetry: true,
              });
              auditLog.assetsFailed++;
              isFullySuccessful = false;
            }
          }
        },
        30,
        3,
        500,
        false,
      );
    }

    auditLog.executionMs = Date.now() - startTime;
    auditLog.status = LifecycleConfig.dryRun
      ? 'dry_run'
      : isFullySuccessful
        ? 'completed'
        : 'failed';

    await auditLog.save();

    if (!isFullySuccessful && !LifecycleConfig.dryRun) {
      throw new Error('Partial or full failure during asset cleanup batch');
    }
  }
}
