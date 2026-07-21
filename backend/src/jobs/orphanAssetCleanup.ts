import mongoose from 'mongoose';
import logger from '../config/logger';
import {
  getRegisteredAssetFields,
  SNAPSHOT_MODELS,
  SKIP_MODELS,
} from '../utils/AssetLifecyclePlugin';

export const detectOrphanedAssets = async (): Promise<{
  checkedDocuments: number;
  orphanedUrls: string[];
  brokenReferences: string[];
}> => {
  logger.info('[ORPHAN CLEANUP] Starting universal orphaned asset detection...');

  const orphanedUrls: Set<string> = new Set();
  const brokenReferences: string[] = [];
  let checkedDocuments = 0;

  try {
    for (const [modelName, Model] of Object.entries(mongoose.models)) {
      if (SNAPSHOT_MODELS?.has(modelName) || SKIP_MODELS?.has(modelName)) continue;

      const assetFields = getRegisteredAssetFields(modelName);
      if (assetFields.length === 0) continue;

      // Check soft-deleted docs for URLs that haven't been purged
      if (Model.schema.paths.isDeleted) {
        const deletedDocs = await Model.find({ isDeleted: true }).lean();
        for (const doc of deletedDocs) {
          checkedDocuments++;
          // For a robust check we'd use the extractUrls logic, but for simplicity here we just flag the fields
          for (const field of assetFields) {
            const val = doc[field.path];
            if (typeof val === 'string' && val.includes('cloudinary')) {
              orphanedUrls.add(val);
            }
          }
        }
      }
    }

    // Now cross-reference with Media collection
    // ...

    return {
      checkedDocuments,
      orphanedUrls: Array.from(orphanedUrls),
      brokenReferences,
    };
  } catch (error: any) {
    logger.error(`[ORPHAN CLEANUP] Error during scan: ${error.message}`);
    throw error;
  }
};
