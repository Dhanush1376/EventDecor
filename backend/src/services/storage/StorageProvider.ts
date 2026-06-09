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
}

export interface StorageProvider {
  /**
   * Uploads a file buffer directly to the storage provider.
   * Ensures the image is converted to WebP, resized to max-width 1920px,
   * metadata stripped, and aggressively compressed.
   */
  uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;

  /**
   * Deletes a file from the storage provider by its identifier/URL.
   */
  deleteFile(url: string): Promise<boolean>;
}
