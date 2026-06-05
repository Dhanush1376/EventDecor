import { openDB } from 'idb';

const DB_NAME = 'admin_drafts_db';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

/**
 * Initialize and open the IndexedDB connection
 */
export async function getDraftDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        // Create indexes for efficient querying
        store.createIndex('module', 'module');
        store.createIndex('updatedAt', 'updatedAt');
      }
    },
  });
}

/**
 * Save a draft to the database
 * @param {string} draftKey Unique composite key (e.g., 'admin:products:add')
 * @param {Object} draftData The draft payload
 * @returns {Promise<void>}
 */
export async function saveDraft(draftKey, draftData) {
  try {
    const db = await getDraftDB();
    const payload = {
      ...draftData,
      key: draftKey,
      updatedAt: Date.now(),
      createdAt: draftData.createdAt || Date.now(),
    };
    await db.put(STORE_NAME, payload);
  } catch (error) {
    console.error(`[DraftService] Failed to save draft ${draftKey}:`, error);
  }
}

/**
 * Retrieve a specific draft
 * @param {string} draftKey
 * @returns {Promise<Object|null>}
 */
export async function getDraft(draftKey) {
  try {
    const db = await getDraftDB();
    return await db.get(STORE_NAME, draftKey);
  } catch (error) {
    console.error(`[DraftService] Failed to get draft ${draftKey}:`, error);
    return null;
  }
}

/**
 * Delete a specific draft
 * @param {string} draftKey
 * @returns {Promise<void>}
 */
export async function deleteDraft(draftKey) {
  try {
    const db = await getDraftDB();
    await db.delete(STORE_NAME, draftKey);
  } catch (error) {
    console.error(`[DraftService] Failed to delete draft ${draftKey}:`, error);
  }
}

/**
 * Get all saved drafts
 * @returns {Promise<Array>}
 */
export async function getAllDrafts() {
  try {
    const db = await getDraftDB();
    const drafts = await db.getAllFromIndex(STORE_NAME, 'updatedAt');
    // Return sorted descending (newest first)
    return drafts.reverse();
  } catch (error) {
    console.error('[DraftService] Failed to get all drafts:', error);
    return [];
  }
}

/**
 * Delete all drafts completely
 * @returns {Promise<void>}
 */
export async function deleteAllDrafts() {
  try {
    const db = await getDraftDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('[DraftService] Failed to delete all drafts:', error);
  }
}

/**
 * Get storage statistics
 * @returns {Promise<{count: number, estimatedBytes: number}>}
 */
export async function getStorageStats() {
  try {
    const drafts = await getAllDrafts();
    const count = drafts.length;
    // Rough estimation of size by stringifying
    const estimatedBytes = new Blob([JSON.stringify(drafts)]).size;
    return { count, estimatedBytes };
  } catch (error) {
    console.error('[DraftService] Failed to get storage stats:', error);
    return { count: 0, estimatedBytes: 0 };
  }
}

/**
 * Delete drafts older than maxAgeDays
 * @param {number} maxAgeDays Default 30
 * @returns {Promise<number>} Number of deleted drafts
 */
export async function cleanExpiredDrafts(maxAgeDays = 30) {
  try {
    const db = await getDraftDB();
    const drafts = await db.getAll(STORE_NAME);
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const draft of drafts) {
      if (draft.updatedAt < cutoff) {
        await store.delete(draft.key);
        deletedCount++;
      }
    }

    await tx.done;
    if (deletedCount > 0) {
      console.log(`[DraftService] Cleaned up ${deletedCount} expired drafts.`);
    }
    return deletedCount;
  } catch (error) {
    console.error('[DraftService] Failed to clean expired drafts:', error);
    return 0;
  }
}

/**
 * Calculate size in readable format
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
