import axios from 'axios';
import GlobalAiSettings from '../../models/GlobalAiSettings';
import AiProvider from '../../models/AiProvider';
import AiUsageLog from '../../models/AiUsageLog';
import { VISION_PROVIDER_CONFIG, getVisionModel } from './providerRegistry';
import { preprocessImage } from './imagePreprocessor';
import logger from '../../config/logger';

export class AIClient {
  /**
   * Internal helper to resolve the active provider and settings.
   */
  private static async resolveProvider(providerOverride?: string) {
    if (providerOverride) {
      const specificProvider = await AiProvider.findById(providerOverride);
      if (specificProvider && specificProvider.enabled && specificProvider.isValidated) {
        // Mock a settings object that forces the use of this specific provider
        return {
          settings: {
            temperature: 0.2,
            maxTokens: 4000,
            requestTimeout: 60000,
            retryCount: 0, // No fallback when specifically requesting a provider
            autoSelectModel: true,
            fallbackProviderIds: [],
          },
          provider: specificProvider as any,
        };
      }
      logger.warn(
        `Requested provider override ${providerOverride} not found or disabled. Falling back to global default.`,
      );
    }

    const settings = await GlobalAiSettings.findOne()
      .populate('selectedProviderId')
      .populate('fallbackProviderIds');

    if (!settings) {
      // Fallback to env var for backward compatibility
      if (process.env.GROQ_API_KEY) {
        return {
          settings: {
            temperature: 0.2,
            maxTokens: 4000,
            requestTimeout: 60000,
            retryCount: 2,
            autoSelectModel: true,
            fallbackProviderIds: [],
          },
          provider: {
            id: 'legacy-groq',
            name: 'Legacy Groq (Env)',
            provider: 'groq',
            getDecryptedApiKey: () => process.env.GROQ_API_KEY,
            endpointUrl: '',
            modelOverride: '',
            capabilities: { vision: false, text: true, jsonMode: true },
          },
        };
      }
      throw new Error('No Global AI Settings configured and GROQ_API_KEY is missing.');
    }

    if (!settings.selectedProviderId) {
      throw new Error('No AI Provider selected in Global AI Settings.');
    }

    return {
      settings,
      provider: settings.selectedProviderId as any,
    };
  }

  /**
   * Execute an API request with retries and failover.
   */
  private static async executeWithRetryAndFailover(
    feature: string,
    payloadBuilder: (provider: any, model: string) => any,
    isVision: boolean,
    settings: any,
    initialProvider: any,
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
      providerOverride?: string;
    },
  ) {
    let currentProvider = initialProvider;
    let attempts = 0;
    const maxRetries = settings.retryCount ?? 2;
    const fallbacks = settings.fallbackProviderIds || [];
    let fallbackIndex = 0;

    while (true) {
      attempts++;
      const config = VISION_PROVIDER_CONFIG[currentProvider.provider];

      let model = currentProvider.modelOverride;
      if (!model || settings.autoSelectModel) {
        model = getVisionModel(currentProvider.provider, 'production');
      }

      const baseURL =
        currentProvider.provider === 'custom' ||
        currentProvider.provider === 'azure_openai' ||
        currentProvider.provider === 'ollama'
          ? currentProvider.endpointUrl || config.baseURL
          : config.baseURL;

      const headers: Record<string, string> = {
        [config.headerKey]: `${config.headerPrefix}${currentProvider.getDecryptedApiKey()}`,
        'Content-Type': 'application/json',
        ...config.extraHeaders,
      };

      const payload = payloadBuilder(currentProvider, model);
      const startTime = Date.now();
      let errorMsg: string;
      let textResponse: string;
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        let res;
        if (config.apiFormat === 'gemini') {
          res = await axios.post(`${baseURL}/models/${model}:generateContent`, payload, {
            headers,
            params: { key: currentProvider.getDecryptedApiKey() },
            timeout: settings.requestTimeout,
          });
          textResponse = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          inputTokens = res.data.usageMetadata?.promptTokenCount || 0;
          outputTokens = res.data.usageMetadata?.candidatesTokenCount || 0;
        } else if (currentProvider.provider === 'anthropic') {
          res = await axios.post(`${baseURL}/messages`, payload, {
            headers,
            timeout: settings.requestTimeout,
          });
          textResponse = res.data.content?.[0]?.text || '';
          inputTokens = res.data.usage?.input_tokens || 0;
          outputTokens = res.data.usage?.output_tokens || 0;
        } else {
          // OpenAI compatible
          const url =
            currentProvider.provider === 'azure_openai'
              ? `${baseURL}/deployments/${model}/chat/completions?api-version=2024-02-15-preview`
              : `${baseURL}/chat/completions`;
          res = await axios.post(url, payload, { headers, timeout: settings.requestTimeout });
          textResponse = res.data.choices?.[0]?.message?.content || '';
          inputTokens = res.data.usage?.prompt_tokens || 0;
          outputTokens = res.data.usage?.completion_tokens || 0;
        }
        // Log Usage
        if (currentProvider.id !== 'legacy-groq') {
          await AiUsageLog.create({
            feature,
            providerId: currentProvider._id,
            providerName: currentProvider.name,
            model,
            latencyMs: Date.now() - startTime,
            inputTokens,
            outputTokens,
            success: true,
          });

          // Update health async
          AiProvider.findByIdAndUpdate(currentProvider._id, {
            'health.status': 'healthy',
            'health.lastSuccessAt': new Date(),
          }).catch((err) => logger.error(`Failed to update provider health: ${err.message}`));
        }

        return textResponse;
      } catch (err: any) {
        errorMsg = err.response?.data?.error?.message || err.message || 'Unknown error';

        logger.error(`[AIClient] Provider ${currentProvider.name} failed: ${errorMsg}`);

        if (currentProvider.id !== 'legacy-groq') {
          await AiUsageLog.create({
            feature,
            providerId: currentProvider._id,
            providerName: currentProvider.name,
            model,
            latencyMs: Date.now() - startTime,
            inputTokens,
            outputTokens,
            success: false,
            error: errorMsg,
          });

          AiProvider.findByIdAndUpdate(currentProvider._id, {
            'health.status': 'degraded',
            'health.lastErrorAt': new Date(),
            'health.lastError': errorMsg,
          }).catch((e) => logger.error(`Failed to update provider health: ${e.message}`));
        }

        // Retry logic
        if (attempts <= maxRetries) {
          logger.info(
            `[AIClient] Retrying with ${currentProvider.name} (Attempt ${attempts + 1})...`,
          );
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempts - 1))); // Exponential backoff
          continue;
        }

        // Failover logic
        if (fallbackIndex < fallbacks.length) {
          logger.warn(`[AIClient] Failing over to next provider...`);
          currentProvider = fallbacks[fallbackIndex];
          fallbackIndex++;
          attempts = 0; // reset attempts for new provider
          continue;
        }

        throw new Error(`AI Request failed after retries and failovers. Last error: ${errorMsg}`, {
          cause: err,
        });
      }
    }
  }

  /**
   * Generate text completion using the Global AI Provider.
   */
  public static async generateText(
    feature: string,
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
      providerOverride?: string;
    } = {},
  ): Promise<string> {
    const { settings, provider } = await this.resolveProvider(options.providerOverride);

    const buildPayload = (prov: any, model: string) => {
      const config = VISION_PROVIDER_CONFIG[prov.provider];
      if (config.apiFormat === 'gemini') {
        return {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? settings.temperature,
            maxOutputTokens: options.maxTokens ?? settings.maxTokens,
            responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
          },
        };
      } else if (prov.provider === 'anthropic') {
        return {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens ?? settings.maxTokens,
          temperature: options.temperature ?? settings.temperature,
        };
      } else {
        const payload: any = {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature ?? settings.temperature,
          max_tokens: options.maxTokens ?? settings.maxTokens,
        };
        if (options.jsonMode && prov.capabilities?.jsonMode) {
          payload.response_format = { type: 'json_object' };
        }
        return payload;
      }
    };

    return this.executeWithRetryAndFailover(
      feature,
      buildPayload,
      false,
      settings,
      provider,
      options,
    );
  }

  /**
   * Generate vision completion using the Global AI Provider.
   */
  public static async generateVision(
    feature: string,
    base64Image: string,
    mimeType: string,
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
      providerOverride?: string;
    } = {},
  ): Promise<string> {
    const { settings, provider } = await this.resolveProvider(options.providerOverride);

    // Preprocess image
    const processedImage = await preprocessImage(base64Image, mimeType, 800);

    const buildPayload = (prov: any, model: string) => {
      const config = VISION_PROVIDER_CONFIG[prov.provider];

      if (config.apiFormat === 'gemini') {
        return {
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: processedImage.mimeType,
                    data: processedImage.base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? settings.temperature,
            maxOutputTokens: options.maxTokens ?? settings.maxTokens,
            responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
          },
        };
      } else if (prov.provider === 'anthropic') {
        return {
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: processedImage.mimeType as any,
                    data: processedImage.base64,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
          max_tokens: options.maxTokens ?? settings.maxTokens,
          temperature: options.temperature ?? settings.temperature,
        };
      } else {
        // Check if the provider actually supports vision
        const providerSupportsVision = config.supportsVision !== false;

        const payload: any = {
          model,
          messages: [
            {
              role: 'user',
              content: providerSupportsVision
                ? [
                    { type: 'text', text: prompt },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${processedImage.mimeType};base64,${processedImage.base64}`,
                        detail: 'high',
                      },
                    },
                  ]
                : prompt, // Text-only fallback for non-vision providers
            },
          ],
          temperature: options.temperature ?? settings.temperature,
          max_tokens: options.maxTokens ?? settings.maxTokens,
        };
        if (options.jsonMode && prov.capabilities?.jsonMode) {
          payload.response_format = { type: 'json_object' };
        }
        return payload;
      }
    };

    return this.executeWithRetryAndFailover(
      feature,
      buildPayload,
      true,
      settings,
      provider,
      options,
    );
  }
}
