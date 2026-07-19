import axios from 'axios';
import { VISION_PROVIDER_CONFIG } from './providerRegistry';
import logger from '../../config/logger';

export interface ModelInfo {
  id: string;
  name: string;
  supportsVision: boolean;
  supportsJson: boolean;
  supportsStreaming: boolean;
  contextWindow?: number;
}

/**
 * Dynamically detect available models for a given provider and API key.
 * This function handles the nuances of different provider's /models endpoints.
 */
export async function detectModels(
  provider: string,
  apiKey: string,
  endpointUrl?: string,
): Promise<ModelInfo[]> {
  const config = VISION_PROVIDER_CONFIG[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Anthropic does not have a public /models endpoint.
  // We return a static list of known models.
  if (provider === 'anthropic') {
    return [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        supportsVision: true,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 200000,
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        supportsVision: true,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 200000,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        supportsVision: false,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 200000,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        supportsVision: true,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 200000,
      },
    ];
  }

  const baseURL =
    provider === 'custom' || provider === 'azure_openai' || provider === 'ollama'
      ? endpointUrl || config.baseURL
      : config.baseURL;

  const headers: Record<string, string> = {
    [config.headerKey]: `${config.headerPrefix}${apiKey}`,
    ...config.extraHeaders,
  };

  try {
    if (provider === 'gemini') {
      // Gemini Models API
      const res = await axios.get(`${baseURL}/models`, { headers, params: { key: apiKey } });
      const models = res.data.models || [];
      return models
        .map((m: any) => {
          const supportsVision = m.supportedGenerationMethods?.includes('generateContent') || false;
          return {
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', ''),
            supportsVision,
            supportsJson: true,
            supportsStreaming: true,
            contextWindow: m.inputTokenLimit,
          };
        })
        .filter((m: any) => !m.id.includes('embedding') && !m.id.includes('bison'));
    }

    // Default OpenAI-compatible /models endpoint
    const url =
      provider === 'azure_openai'
        ? `${baseURL}/deployments?api-version=2024-02-15-preview`
        : provider === 'ollama'
          ? `${baseURL.replace('/v1', '')}/api/tags`
          : `${baseURL}/models`;

    const res = await axios.get(url, { headers });

    if (provider === 'ollama') {
      const models = res.data.models || [];
      return models.map((m: any) => {
        const isVision =
          m.name.includes('vision') || m.name.includes('llava') || m.name.includes('minicpm-v');
        return {
          id: m.name,
          name: m.name,
          supportsVision: isVision,
          supportsJson: true,
          supportsStreaming: true,
        };
      });
    }

    const models = res.data.data || res.data || [];
    const modelList = Array.isArray(models) ? models : [];

    return modelList
      .map((m: any) => {
        const id = m.id;
        // Heuristic to detect vision models
        const supportsVision =
          id.includes('vision') ||
          id.includes('gpt-4o') ||
          id.includes('claude-3') ||
          id.includes('gemini') ||
          id.includes('pixtral') ||
          id.includes('vl') || // qwen-vl
          config.supportsVision; // fallback to provider capability

        return {
          id,
          name: id,
          supportsVision,
          supportsJson: true,
          supportsStreaming: true,
        };
      })
      .filter(
        (m: any) =>
          !m.id.includes('embedding') &&
          !m.id.includes('tts') &&
          !m.id.includes('whisper') &&
          !m.id.includes('dall-e'),
      );
  } catch (error: any) {
    logger.error(`[MODEL_DETECTOR] Failed to detect models for ${provider}: ${error.message}`);
    // Return empty array instead of throwing to avoid breaking the UI completely
    return [];
  }
}
