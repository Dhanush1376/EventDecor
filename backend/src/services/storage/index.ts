import { StorageProvider } from './StorageProvider';
import { CloudinaryStorageProvider } from './CloudinaryStorageProvider';

class StorageServiceFactory {
  private static instance: StorageProvider;

  static getProvider(): StorageProvider {
    if (!this.instance) {
      // Future-proofing: Could read from env var e.g., process.env.STORAGE_PROVIDER === 'R2'
      this.instance = new CloudinaryStorageProvider();
    }
    return this.instance;
  }
}

export const storageService = StorageServiceFactory.getProvider();
