/* eslint-disable no-console */
import { Schema } from 'mongoose';
import logger from '../config/logger';
import { cleanupQueue } from '../jobs/queues';
import { LifecycleConfig } from '../config/lifecycleConfig';

export const SNAPSHOT_MODELS = new Set([
  'Order',
  'ExchangeRequest',
  'ReturnRequest',
  'RentalOrder',
  'CustomOrder',
  'InventoryLedger',
  'AdminAuditLog',
  'VersionHistory',
]);

export const SKIP_MODELS = new Set(['StoreSettings', 'CleanupAuditLog', 'Media']);

export interface AssetFieldDescriptor {
  path: string;
  type: 'single' | 'array' | 'nested' | 'mixed';
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  source?: 'explicit' | 'discovered';
  confidence?: number;
}

export interface AssetLifecycleOptions {
  tier?: 1 | 2 | 3 | 4;
  assetFields?: AssetFieldDescriptor[];
  autoDiscover?: boolean;
  excludeFields?: string[];
  snapshotFields?: string[];
  disabled?: boolean;
}

// Global registry of all asset fields mapped by model name
const modelAssetRegistry = new Map<string, AssetFieldDescriptor[]>();

export function getRegisteredAssetFields(modelName: string): AssetFieldDescriptor[] {
  return modelAssetRegistry.get(modelName) || [];
}

/**
 * Basic auto-discovery of asset fields based on naming conventions.
 */
function discoverAssetFields(schema: Schema): AssetFieldDescriptor[] {
  const discovered: AssetFieldDescriptor[] = [];

  schema.eachPath((pathname, schemaType) => {
    // Skip internal fields
    if (pathname.startsWith('_')) return;

    const lowerPath = pathname.toLowerCase();

    // Naming heuristics for media fields
    const isLikelyMedia =
      lowerPath.includes('image') ||
      lowerPath.includes('video') ||
      lowerPath.includes('avatar') ||
      lowerPath.includes('logo') ||
      lowerPath.includes('banner') ||
      lowerPath.includes('thumbnail') ||
      lowerPath.includes('attachment') ||
      lowerPath.includes('pdf');

    if (isLikelyMedia) {
      if (schemaType.instance === 'String') {
        discovered.push({ path: pathname, type: 'single', source: 'discovered', confidence: 0.8 });
      } else if (schemaType.instance === 'Array') {
        // We might want to check the array type, but assume array of strings or subdocs
        discovered.push({ path: pathname, type: 'array', source: 'discovered', confidence: 0.7 });
      }
    }
  });

  return discovered;
}

/**
 * Mongoose Plugin for Universal Asset Lifecycle Management
 */
export const AssetLifecyclePlugin = (schema: Schema, options?: AssetLifecycleOptions) => {
  if (options?.disabled || !LifecycleConfig.enabled) return;

  schema.on('init', (model: any) => {
    const modelName = model.modelName;
    if (SKIP_MODELS.has(modelName)) return;

    // 1. Explicit registration
    const explicitFields: AssetFieldDescriptor[] = (options?.assetFields || []).map((f) => ({
      ...f,
      source: 'explicit',
      confidence: 1.0,
    }));

    // 2. Auto-discovery
    let discoveredFields: AssetFieldDescriptor[] = [];
    if (options?.autoDiscover !== false) {
      discoveredFields = discoverAssetFields(schema).filter(
        (f) => !explicitFields.some((e) => e.path === f.path),
      ); // Avoid duplicates
    }

    const allAssetFields = [...explicitFields, ...discoveredFields];

    // 3. Opt-out exclusions
    const excludedPaths = new Set([
      ...(options?.excludeFields || []),
      ...(options?.snapshotFields || []),
    ]);

    const activeFields = allAssetFields.filter((f) => !excludedPaths.has(f.path));

    if (activeFields.length > 0) {
      modelAssetRegistry.set(modelName, activeFields);
      logger.info(
        `[AssetLifecycle] ${modelName}: ${explicitFields.length} explicit, ` +
          `${discoveredFields.length} discovered, ${excludedPaths.size} excluded`,
      );
    }
  });

  // Helper to extract URLs from a document based on registered fields
  const extractUrls = (doc: any, fields: AssetFieldDescriptor[]): string[] => {
    const urls = new Set<string>();

    for (const field of fields) {
      const val = doc.get(field.path);
      if (!val) continue;

      if (field.type === 'single' && typeof val === 'string') {
        urls.add(val);
      } else if (field.type === 'array' && Array.isArray(val)) {
        val.forEach((item: any) => {
          if (typeof item === 'string') {
            urls.add(item);
          } else if (item && typeof item === 'object') {
            // For array of objects like { url: '...' } or { src: '...' }
            if (item.url) urls.add(item.url);
            else if (item.src) urls.add(item.src);
            else if (item.secureUrl) urls.add(item.secureUrl);
          }
        });
      } else if (field.type === 'mixed' || field.type === 'nested') {
        // Deep search for URLs in arbitrary JSON
        const searchDeep = (obj: any) => {
          if (!obj) return;
          if (
            typeof obj === 'string' &&
            (obj.startsWith('http://') || obj.startsWith('https://'))
          ) {
            urls.add(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach(searchDeep);
          } else if (typeof obj === 'object') {
            Object.values(obj).forEach(searchDeep);
          }
        };
        searchDeep(val);
      }
    }
    return Array.from(urls);
  };

  // Pre hooks to capture OLD state before updates
  schema.pre('findOneAndUpdate', async function (this: any) {
    if (!LifecycleConfig.enabled) return;
    this._originalDocForCleanup = await this.model.findOne(this.getQuery()).lean();
  });

  schema.pre('save', async function (this: any) {
    if (!LifecycleConfig.enabled || this.isNew) return;
    try {
      this._originalDocForCleanup = await (this.constructor as any).findById(this._id).lean();
      console.log(
        `[Plugin DEBUG] pre(save) fetched oldDoc for ${this.constructor.modelName} ${this._id}. oldDoc.imageSrc:`,
        this._originalDocForCleanup?.imageSrc,
      );
    } catch (err) {
      console.error(`[Plugin DEBUG] Error in pre(save):`, err);
    }
  });

  // Post hooks to trigger diff & cleanup asynchronously
  const runCleanup = (modelName: string, oldDoc: any, newDoc: any, contextInfo: any) => {
    if (!LifecycleConfig.enabled || !oldDoc || !newDoc) return;
    if (SNAPSHOT_MODELS.has(modelName)) return;

    const fields = getRegisteredAssetFields(modelName);
    if (fields.length === 0) return;

    const oldUrls = extractUrls(
      { get: (p: string) => oldDoc[p] || p.split('.').reduce((o, i) => o?.[i], oldDoc) },
      fields,
    );
    const newUrls = extractUrls(
      { get: (p: string) => newDoc[p] || p.split('.').reduce((o, i) => o?.[i], newDoc) },
      fields,
    );

    const removedUrls = oldUrls.filter((url) => !newUrls.includes(url));
    console.log(
      `[Plugin DEBUG] runCleanup for ${modelName}: oldUrls=${oldUrls}, newUrls=${newUrls}, removedUrls=${removedUrls}`,
    );

    if (removedUrls.length > 0) {
      logger.info(
        `[AssetLifecycle] ${modelName} updated, ${removedUrls.length} assets removed. Queueing cleanup.`,
      );

      setTimeout(() => {
        cleanupQueue.add(
          'clean-replaced-assets',
          {
            oldData: oldUrls,
            newData: newUrls,
            context: {
              entityType: modelName,
              entityId: newDoc._id.toString(),
              ...contextInfo,
            },
          },
          { delay: 5000 },
        );
      }, 2000);
    }
  };

  schema.post('findOneAndUpdate', function (doc: any) {
    if (!doc) return;
    const oldDoc = (this as any)._originalDocForCleanup;
    if (oldDoc) {
      runCleanup(doc.constructor.modelName, oldDoc, doc.toObject ? doc.toObject() : doc, {
        operation: 'update',
      });
    }
  });

  schema.post('save', function (doc: any) {
    const oldDoc = (this as any)._originalDocForCleanup;
    if (oldDoc) {
      runCleanup(doc.constructor.modelName, oldDoc, doc.toObject ? doc.toObject() : doc, {
        operation: 'update',
      });
    }
  });

  // Soft-delete hook triggers (assuming SoftDeletePlugin sets isDeleted = true in updateMany or similar)
  // Realistically, soft delete will eventually be purged by pendingDeleteSweeper,
  // but if hard-deleted, we queue cleanup of ALL assets.
  schema.post('findOneAndDelete', function (doc: any) {
    if (!doc || !LifecycleConfig.enabled) return;
    const modelName = doc.constructor.modelName;
    if (SNAPSHOT_MODELS.has(modelName)) return;

    const fields = getRegisteredAssetFields(modelName);
    if (fields.length === 0) return;

    const urls = extractUrls(
      { get: (p: string) => doc[p] || p.split('.').reduce((o, i) => o?.[i], doc) },
      fields,
    );

    if (urls.length > 0) {
      setTimeout(() => {
        cleanupQueue.add(
          'clean-all-assets',
          {
            data: urls,
            context: {
              entityType: modelName,
              entityId: doc._id.toString(),
              operation: 'purge',
            },
          },
          { delay: 5000 },
        );
      }, 2000);
    }
  });
};
