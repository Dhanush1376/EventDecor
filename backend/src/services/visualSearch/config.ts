import VisualSearchConfig, { IVisualSearchConfig } from '../../models/VisualSearchConfig';
import { validateVisionApiKey } from '../ai/apiValidator';
import { MemoryCache } from '../../utils/cache/MemoryCache';

export const configCache = new MemoryCache({ defaultTtlMs: 60 * 1000, maxKeys: 5 });

export async function getVisualSearchConfig(): Promise<IVisualSearchConfig> {
  const cached = configCache.get<IVisualSearchConfig>('vs_config');
  if (cached) return cached;

  let config = await VisualSearchConfig.findOne();
  if (!config) {
    config = await VisualSearchConfig.create({
      enabled: false,
      provider: {
        name: 'groq',
        apiKey: process.env.GROQ_API_KEY || '',
        isValidated: !!process.env.GROQ_API_KEY,
      },
    });
  }

  configCache.set('vs_config', config, 60 * 1000);
  return config;
}

export async function updateVisualSearchConfig(
  updates: Partial<IVisualSearchConfig>,
  userId?: string,
): Promise<IVisualSearchConfig> {
  let config = await VisualSearchConfig.findOne();
  if (!config) {
    config = new VisualSearchConfig({});
  }

  const allowedFields = [
    'enabled',
    'cameraSearchEnabled',
    'imageUploadEnabled',
    'similarProductsEnabled',
    'searchSensitivity',
    'resultCount',
    'similarityThreshold',
    'provider',
    'analyticsEnabled',
    'saveSearchedImages',
  ];

  for (const field of allowedFields) {
    if ((updates as any)[field] !== undefined) {
      if (field === 'provider' && (updates as any).provider) {
        const p = (updates as any).provider;
        config.provider.name = p.name ?? config.provider.name;
        if (p.apiKey !== undefined && p.apiKey !== '****') {
          config.provider.apiKey = p.apiKey;
        }
        if (p.secretKey !== undefined && p.secretKey !== '****') {
          config.provider.secretKey = p.secretKey;
        }
        config.provider.endpointUrl = p.endpointUrl ?? config.provider.endpointUrl;
        config.provider.isValidated = p.isValidated ?? config.provider.isValidated;
      } else {
        (config as any)[field] = (updates as any)[field];
      }
    }
  }

  if (userId) {
    config.updatedBy = userId as any;
  }

  await config.save();
  configCache.delete('vs_config');
  return config;
}

export async function validateProviderCredentials(
  providerName: string,
  apiKey: string,
  endpointUrl?: string,
): Promise<{
  valid: boolean;
  model?: string;
  error?: string;
  latencyMs?: number;
  suggestions?: string[];
  status?: string;
}> {
  return await validateVisionApiKey(providerName, apiKey, endpointUrl);
}
