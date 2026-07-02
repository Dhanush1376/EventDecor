import crypto from 'crypto';
import { DistributedLock } from '../../utils/DistributedLock';
import Media, { IMedia } from '../../models/Media';
import logger from '../../config/logger';

export interface IMediaMeta {
  bytes: number;
  width?: number;
  height?: number;
  resourceType: string;
}

export class DuplicateDetector {
  /**
   * Computes the SHA-256 hash of a file buffer for content-based deduplication.
   */
  static computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Checks if an active media asset with the given hash and metadata already exists.
   */
  static async findDuplicate(hash: string, meta: IMediaMeta): Promise<IMedia | null> {
    try {
      const query: any = {
        hash,
        bytes: meta.bytes,
        resourceType: meta.resourceType,
        status: 'active',
      };

      if (meta.width) query.width = meta.width;
      if (meta.height) query.height = meta.height;

      const existing = await Media.findOne(query).exec();
      if (existing) {
        logger.debug(`[DuplicateDetector] Found existing active media for hash: ${hash}`);
      }
      return existing;
    } catch (error) {
      logger.error(`[DuplicateDetector] Error checking for duplicate hash: ${hash}`, error);
      return null;
    }
  }

  /**
   * Executes a media upload operation within a distributed lock based on the file hash.
   * Prevents race conditions where two identical files are uploaded simultaneously.
   *
   * @param hash The SHA-256 hash of the file content
   * @param meta The metadata required for compound duplicate detection
   * @param operation The upload logic to execute if the lock is acquired
   */
  static async withDuplicateLock<T>(
    hash: string,
    meta: IMediaMeta,
    operation: () => Promise<T>,
  ): Promise<T> {
    // Incorporate bytes into the lock key to narrow the lock scope
    const resourceKey = `media:upload:${hash}:${meta.bytes}`;

    // Use DistributedLock with failClosed=false because if Redis is down, we still want
    // to allow uploads (falling back to in-memory lock or bypassing). We don't want
    // the entire media upload system to fail just because Redis is temporarily unavailable.
    return DistributedLock.withLock(
      resourceKey,
      async () => {
        // Double check pattern: Inside the lock, check if another process just finished
        // uploading this exact file while we were waiting for the lock.
        const existing = await this.findDuplicate(hash, meta);

        if (existing) {
          logger.info(
            `[DuplicateDetector] Another process uploaded hash ${hash} while waiting. Reusing asset.`,
          );
          // If we found it, we throw a special error that the caller can catch to return the existing asset.
          // This prevents running the costly 'operation' (upload to Cloudinary).
          throw new DuplicateFoundError('Duplicate detected after lock acquisition', existing);
        }

        return await operation();
      },
      30, // 30 seconds TTL for the lock
      3, // 3 retries
      500, // 500ms delay between retries
      false, // failClosed = false
    );
  }
}

/**
 * Custom error thrown when a duplicate is found during the lock period.
 */
export class DuplicateFoundError extends Error {
  public existingMedia: IMedia;

  constructor(message: string, existingMedia: IMedia) {
    super(message);
    this.name = 'DuplicateFoundError';
    this.existingMedia = existingMedia;
  }
}
