import getCloudinary from '../config/cloudinary';
import logger from '../config/logger';

export class StorageStatisticsService {
  /**
   * Retrieves overall storage statistics from the primary provider.
   */
  static async getProviderStats() {
    try {
      const cloudinary = getCloudinary();

      // The usage API requires Cloudinary Provisioning API credentials
      // which might not be available on all plans. We'll attempt it
      // and gracefully fallback.
      const usage = await cloudinary.api.usage();
      return {
        bandwidth: usage.bandwidth,
        storage: usage.storage,
        requests: usage.requests,
        resources: usage.resources,
        derived_resources: usage.derived_resources,
      };
    } catch (err: any) {
      logger.warn(`[StorageStats] Failed to fetch provider stats: ${err.message}`);
      return {
        bandwidth: null,
        storage: null,
        requests: null,
        resources: null,
        error: 'Usage API not available or failed',
      };
    }
  }
}
