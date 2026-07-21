import { StorageProvider } from './StorageProvider';
import { CloudinaryStorageProvider } from './CloudinaryStorageProvider';

export class StorageRegistry {
  private static instance: StorageProvider;
  private static providers: StorageProvider[] = [new CloudinaryStorageProvider()];

  static getProvider(): StorageProvider {
    if (!this.instance) {
      // Future-proofing: Could read from env var e.g., process.env.STORAGE_PROVIDER === 'R2'
      this.instance = this.providers[0]; // Default to Cloudinary
    }
    return this.instance;
  }

  static resolveProvider(url: string): StorageProvider | null {
    for (const provider of this.providers) {
      if (provider.isProviderUrl && provider.isProviderUrl(url)) {
        return provider;
      }
    }
    return null;
  }
}

export const storageService = StorageRegistry.getProvider();
