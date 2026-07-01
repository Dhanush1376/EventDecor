/**
 * providerFactory.ts — Universal Vision AI Provider Factory
 *
 * Replaces the 4 hardcoded provider classes (GroqVisionProvider, OpenAIVisionProvider,
 * GeminiVisionProvider, CustomVisionProvider) with a single data-driven implementation
 * that uses the providerRegistry configuration map.
 *
 * Preserves the existing IVisualAIProvider interface contract used by
 * visualSearchService.ts so no downstream changes are needed.
 */

import logger from '../../config/logger';
import { VISION_PROVIDER_CONFIG, VisionProviderConfig, getVisionModel } from './providerRegistry';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AIAnalysisResult {
  labels: string[];
  category: string;
  attributes: Record<string, string>;
  confidence: number;
  rawResponse?: any;
}

export interface IVisualAIProvider {
  name: string;
  analyzeImage(base64Image: string, mimeType: string): Promise<AIAnalysisResult>;
  validateCredentials(): Promise<boolean>;
}

// ── Shared Prompt ──────────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a visual product recognition AI for "Siri Arts & Crafts", an Indian event decoration e-commerce store.
Analyze the uploaded image and identify the EXACT product/object with maximum specificity. Output ONLY a valid raw JSON object (no markdown) with these keys:

- "productName": Your best guess at the exact product name (e.g. "Sacred Pellikuthuru Lotus Gifting Crate", "Golden Coconut Decoration Tray", "Ganesh Chaturthi Pooja Plate Set"). Be as specific as possible — include material, color, shape, and purpose in the name.
- "labels": Array of 10-15 HIGHLY SPECIFIC identifying phrases. Each label should be 2-4 words and describe a UNIQUE visual characteristic. DO NOT use generic single words like "decoration", "beautiful", "traditional", "handmade", "Indian". Instead use specific multi-word phrases like:
  - "lotus shaped brass tray" (not just "tray")
  - "red velvet fabric lining" (not just "red")
  - "hexagonal gift crate" (not just "gift box")
  - "coconut shell with gold paint" (not just "coconut")
  - "kundan stone border" (not just "stones")
  Include the object's specific shape, form factor, construction method, distinct visual elements, and the exact items visible in the image.
- "category": The best matching product category (e.g. "Wedding Decor", "Pooja Items", "Engagement Trays", "Floral Arrangements", "Birthday Decorations", "Traditional Decorations", "Gift Hampers", "Coconut Decorations", "Bangle Trays", "Harathi Plates", "Pellikuthuru Items", "Seemantham Decor", "Mehendi Plates", "Saree Packing Trays"). Use Title Case.
- "attributes": Object with detected visual attributes:
  - "primaryColor": Dominant color name (be specific: "maroon" not "red", "gold metallic" not "yellow")
  - "secondaryColor": Secondary color if any
  - "material": Detected material (e.g. "brass", "wooden mdf", "silk fabric", "artificial flowers", "real flowers", "cardboard", "velvet", "jute")
  - "style": Style (e.g. "traditional south indian", "modern minimalist", "royal luxury", "rustic ethnic")
  - "occasion": Event type (e.g. "pellikuthuru", "seemantham", "engagement", "wedding", "pooja", "birthday", "naming ceremony", "housewarming")
  - "size": Estimated size (e.g. "small", "medium", "large")
  - "shape": Shape of the object (e.g. "round", "rectangular", "lotus shaped", "hexagonal", "octagonal", "basket shaped")
  - "distinctFeatures": Comma-separated list of the most unique visual features that distinguish this from similar items (e.g. "mirror work border, peacock motif center, beaded handle")
- "confidence": Your confidence in the analysis (0.0 to 1.0)

CRITICAL: Be extremely specific. Two similar-looking trays should get DIFFERENT labels based on their unique details (shape, border style, center motif, handle type, etc.). Generic labels make it impossible to distinguish between products.`;

const SHORT_PROMPT = `Analyze this product image for an Indian event decoration store. Output ONLY valid JSON with:
- "productName": exact product name guess (be very specific)
- "labels": array of 10-15 SPECIFIC multi-word phrases describing unique visual features (NOT generic words like "decoration" or "beautiful")
- "category": product category in Title Case
- "attributes": object with primaryColor, secondaryColor, material, style, occasion, size, shape, distinctFeatures
- "confidence": 0.0-1.0
Be extremely specific — "lotus shaped brass tray with kundan border" NOT "golden tray".`;

// ── Response Parser ────────────────────────────────────────────────────────

function parseAIResponse(text: string): AIAnalysisResult {
  if (!text) throw new Error('Empty response from AI provider');

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown or other wrapping
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON found in AI response');
    parsed = JSON.parse(jsonMatch[0]);
  }

  // Collect labels from multiple sources for richer matching
  const rawLabels: string[] = Array.isArray(parsed.labels) ? parsed.labels.slice(0, 15) : [];

  // Prepend the productName as the highest-priority label if present
  if (typeof parsed.productName === 'string' && parsed.productName.trim()) {
    rawLabels.unshift(parsed.productName.trim());
  }

  // Extract distinctFeatures from attributes and add as labels
  const attrs =
    typeof parsed.attributes === 'object' && parsed.attributes !== null ? parsed.attributes : {};
  if (typeof attrs.distinctFeatures === 'string' && attrs.distinctFeatures.trim()) {
    const features = attrs.distinctFeatures
      .split(',')
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 2);
    rawLabels.push(...features);
  }

  // Deduplicate labels (case-insensitive)
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const label of rawLabels) {
    const key = label.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      labels.push(label);
    }
  }

  return {
    labels: labels.slice(0, 20),
    category: typeof parsed.category === 'string' ? parsed.category : 'General',
    attributes: attrs,
    confidence:
      typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
  };
}

// ── Universal Provider ─────────────────────────────────────────────────────

/**
 * UniversalVisionProvider — A single provider class that handles all
 * OpenAI-compatible and Gemini-native vision APIs using the config map.
 */
class UniversalVisionProvider implements IVisualAIProvider {
  name: string;
  private apiKey: string;
  private config: VisionProviderConfig;

  constructor(providerName: string, apiKey: string, config: VisionProviderConfig) {
    this.name = providerName;
    this.apiKey = apiKey;
    this.config = config;
  }

  async analyzeImage(base64Image: string, mimeType: string): Promise<AIAnalysisResult> {
    if (this.config.apiFormat === 'gemini') {
      return this.analyzeWithGemini(base64Image, mimeType);
    }

    if (this.name === 'anthropic') {
      return this.analyzeWithAnthropic(base64Image, mimeType);
    }

    return this.analyzeWithOpenAI(base64Image, mimeType);
  }

  /**
   * OpenAI-compatible vision API (Groq, OpenAI, OpenRouter, Together, Fireworks, etc.)
   */
  private async analyzeWithOpenAI(
    base64Image: string,
    mimeType: string,
  ): Promise<AIAnalysisResult> {
    const model = getVisionModel(this.name, 'production');
    const url = `${this.config.baseURL}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [this.config.headerKey]: `${this.config.headerPrefix}${this.apiKey}`,
          ...(this.config.extraHeaders || {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: ANALYSIS_PROMPT },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64Image}` },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}) as any);
        const errMsg = errData?.error?.message || errData?.message || `HTTP ${response.status}`;
        logger.error(`[VISUAL_AI:${this.name}] API error ${response.status}:`, { error: errMsg });
        throw new Error(`${this.config.displayName} API error (${response.status}): ${errMsg}`);
      }

      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      return parseAIResponse(text);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`${this.config.displayName} request timed out after 25s`, { cause: err });
      }
      throw err;
    }
  }

  /**
   * Google Gemini native API (different request/response format).
   */
  private async analyzeWithGemini(
    base64Image: string,
    mimeType: string,
  ): Promise<AIAnalysisResult> {
    const model = getVisionModel(this.name, 'production');
    const url = `${this.config.baseURL}/models/${model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SHORT_PROMPT },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}) as any);
        const errMsg = errData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
      }

      const data: any = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return parseAIResponse(text);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Gemini request timed out after 30s', { cause: err });
      }
      throw err;
    }
  }

  /**
   * Anthropic Claude API (distinct auth and message format).
   */
  private async analyzeWithAnthropic(
    base64Image: string,
    mimeType: string,
  ): Promise<AIAnalysisResult> {
    const model = getVisionModel(this.name, 'production');
    const url = `${this.config.baseURL}/messages`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Image,
                  },
                },
                { type: 'text', text: SHORT_PROMPT },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}) as any);
        const errMsg = errData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Anthropic API error (${response.status}): ${errMsg}`);
      }

      const data: any = await response.json();
      const text = data.content?.[0]?.text?.trim();
      return parseAIResponse(text);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Anthropic request timed out after 30s', { cause: err });
      }
      throw err;
    }
  }

  /**
   * Validate credentials by making a lightweight test API call.
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let response: Response;

      if (this.config.apiFormat === 'gemini') {
        // Gemini: list models to validate key
        response = await fetch(`${this.config.baseURL}/models?key=${this.apiKey}`, {
          signal: controller.signal,
        });
      } else if (this.name === 'anthropic') {
        // Anthropic: make a minimal messages call
        response = await fetch(`${this.config.baseURL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: getVisionModel(this.name, 'validation'),
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
      } else {
        // OpenAI-compatible: make a minimal chat completions call
        response = await fetch(`${this.config.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [this.config.headerKey]: `${this.config.headerPrefix}${this.apiKey}`,
            ...(this.config.extraHeaders || {}),
          },
          body: JSON.stringify({
            model: getVisionModel(this.name, 'validation'),
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ── Custom Endpoint Provider ───────────────────────────────────────────────

/**
 * CustomVisionProvider — For user-specified OpenAI-compatible endpoints.
 */
class CustomEndpointProvider implements IVisualAIProvider {
  name = 'custom';
  private apiKey: string;
  private endpointUrl: string;

  constructor(apiKey: string, endpointUrl: string) {
    this.apiKey = apiKey;
    this.endpointUrl = endpointUrl;
  }

  async analyzeImage(base64Image: string, mimeType: string): Promise<AIAnalysisResult> {
    // Normalize endpoint URL
    const baseUrl = this.endpointUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    const url = `${baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'default',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: SHORT_PROMPT },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64Image}` },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Custom provider error: ${response.status}`);

      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      return parseAIResponse(text);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Custom endpoint timed out after 30s', { cause: err });
      }
      throw err;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const baseUrl = this.endpointUrl.replace(/\/+$/, '').replace(/\/chat\/completions.*$/i, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ── Factory Function ───────────────────────────────────────────────────────

/**
 * Create a vision AI provider instance from config.
 *
 * This is the single entry point. It replaces the old switch/case factory
 * in visualSearchService.ts.
 *
 * @param providerName - Provider key (e.g. 'groq', 'openai', 'gemini', 'custom')
 * @param apiKey - The API key for the provider
 * @param endpointUrl - Custom endpoint URL (only for 'custom' provider)
 */
export function createVisionProvider(
  providerName: string,
  apiKey: string,
  endpointUrl?: string,
): IVisualAIProvider {
  // Custom endpoint provider
  if (providerName === 'custom') {
    return new CustomEndpointProvider(apiKey, endpointUrl || '');
  }

  // Look up in registry
  const config = VISION_PROVIDER_CONFIG[providerName];
  if (config) {
    return new UniversalVisionProvider(providerName, apiKey, config);
  }

  // Unknown provider — try as custom OpenAI-compatible
  logger.warn(`[VISUAL_AI] Unknown provider "${providerName}", treating as custom`);
  if (endpointUrl) {
    return new CustomEndpointProvider(apiKey, endpointUrl);
  }

  // Fallback to Groq if no endpoint provided
  const groqConfig = VISION_PROVIDER_CONFIG.groq;
  return new UniversalVisionProvider('groq', apiKey, groqConfig);
}
