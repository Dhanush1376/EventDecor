export interface UploadOptions {
  folder: string;
  originalname: string;
  mimeType?: string;
  isVideo?: boolean;
}

export interface UploadResult {
  url: string;
  thumbnail_url: string | null;
  format: string;
  size: number;
  publicId: string;
  width: number;
  height: number;
  resourceType: string;
  duration?: number;
  codec?: string;
}

export interface StorageProvider {
  /**
   * Upload a file buffer to storage.
   */
  uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;

  /**
   * Permanently delete a file from storage.
   */
  deleteFile(identifier: string): Promise<boolean>;

  /**
   * Permanently delete multiple files from storage in a batch.
   */
  deleteMultiple(identifiers: string[]): Promise<{ succeeded: string[]; failed: string[] }>;

  /**
   * Get metadata info for an asset in storage.
   */
  getAssetInfo(identifier: string): Promise<any>;

  /**
   * Invalidate asset in CDN cache.
   */
  invalidateCache(identifier: string): Promise<void>;
}
