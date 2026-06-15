import crypto from 'crypto';
import sharp from 'sharp';
import Product from '../models/Product';
import Event from '../models/Event';
import ShowcaseCollection from '../models/ShowcaseCollection';
import VisualSearchConfig, { IVisualSearchConfig } from '../models/VisualSearchConfig';
import VisualSearchLog from '../models/VisualSearchLog';
import { MemoryCache } from '../utils/MemoryCache';
import logger from '../config/logger';
import redisClient from '../utils/redis';
import { createVisionProvider, AIAnalysisResult } from './ai/providerFactory';
import { validateVisionApiKey } from './ai/apiValidator';
import { aiVisionCircuitBreaker } from '../utils/CircuitBreaker';

export interface VisualSearchResult {
  id: string;
  title: string;
  slug: string;
  category: string;
  imageSrc: string;
  images: string[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  tags: string[];
  description: string;
  similarityScore: number;
  matchSource: string;
  badges: string[];
  itemType?: 'product' | 'event';
}

export interface VisualSearchResponse {
  bestMatch: VisualSearchResult | null;
  similarProducts: VisualSearchResult[];
  relatedProducts: VisualSearchResult[];
  aiAnalysis: {
    labels: string[];
    category: string;
    attributes: Record<string, string>;
    confidence: number;
  };
  totalResults: number;
  searchDurationMs: number;
}

// ── Caches ──
const configCache = new MemoryCache({ defaultTtlMs: 60 * 1000, maxKeys: 5 });
const analysisCache = new MemoryCache({ defaultTtlMs: 60 * 60 * 1000, maxKeys: 200 });
const matchCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000, maxKeys: 200 });

// ══════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// CONFIG MANAGEMENT
// ══════════════════════════════════════════════

/**
 * Get the visual search config (singleton). Creates one with defaults if missing.
 */
export async function getVisualSearchConfig(): Promise<IVisualSearchConfig> {
  const cached = configCache.get<IVisualSearchConfig>('vs_config');
  if (cached) return cached;

  let config = await VisualSearchConfig.findOne();
  if (!config) {
    // Auto-create default config using existing GROQ_API_KEY if available
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

/**
 * Update visual search config.
 */
export async function updateVisualSearchConfig(
  updates: Partial<IVisualSearchConfig>,
  userId?: string,
): Promise<IVisualSearchConfig> {
  let config = await VisualSearchConfig.findOne();
  if (!config) {
    config = new VisualSearchConfig({});
  }

  // Apply updates
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
        // Only update API/Secret keys if they are explicitly provided and not the masked placeholder
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

/**
 * Validate provider credentials by making a test API call.
 */
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
  // Delegate to the new AI Validator Pipeline
  return await validateVisionApiKey(providerName, apiKey, endpointUrl);
}

// ══════════════════════════════════════════════
// IMAGE PROCESSING
// ══════════════════════════════════════════════

/**
 * Compress and resize image for optimal AI processing.
 */
export async function processImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ base64: string; mimeType: string; hash: string }> {
  // Compute hash of original for caching
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Resize to max 1024px on longest side, convert to JPEG for universal compatibility
  const processed = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();

  return {
    base64: processed.toString('base64'),
    mimeType: 'image/jpeg',
    hash,
  };
}

// ══════════════════════════════════════════════
// PRODUCT MATCHING ENGINE
// ══════════════════════════════════════════════

const cleanWord = (w: string): string => w.toLowerCase().trim().replace(/s$/, '');

// ── Stop Words ──
// These words are so common across all products that matching them adds noise, not signal
const STOP_WORDS = new Set([
  'decoration',
  'decor',
  'decorative',
  'item',
  'set',
  'piece',
  'beautiful',
  'handmade',
  'indian',
  'traditional',
  'design',
  'new',
  'best',
  'premium',
  'quality',
  'special',
  'unique',
  'elegant',
  'stunning',
  'gorgeous',
  'lovely',
  'perfect',
  'amazing',
  'wonderful',
  'exclusive',
  'royal',
  'grand',
  'fancy',
  'artistic',
  'creative',
  'modern',
  'classic',
  'vintage',
  'antique',
  'ethnic',
  'cultural',
  'festive',
  'auspicious',
  'sacred',
  'divine',
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'are',
  'was',
  'have',
  'has',
  'had',
  'been',
  'will',
  'would',
  'could',
  'should',
  'can',
  'may',
  'might',
  'shall',
  'its',
  'our',
  'your',
  'their',
  'also',
  'just',
  'very',
  'more',
  'most',
  'much',
  'many',
  'some',
  'any',
  'each',
  'every',
  'all',
  'both',
  'few',
  'several',
  'own',
  'such',
  'only',
  'other',
  'than',
  'then',
  'when',
  'where',
  'how',
  'what',
  'which',
  'who',
  'whom',
  'why',
  'into',
  'over',
  'after',
  'before',
  'between',
  'under',
  'above',
  'below',
  'along',
  'about',
]);

const isStopWord = (word: string): boolean => STOP_WORDS.has(cleanWord(word));

const hexColorMap: Record<string, string> = {
  '#ffd700': 'gold',
  '#ffc0cb': 'pink',
  '#8b0000': 'red',
  '#ff0000': 'red',
  '#228b22': 'green',
  '#008000': 'green',
  '#ffffff': 'white',
  '#000000': 'black',
  '#808080': 'gray',
  '#0000ff': 'blue',
  '#ffff00': 'yellow',
  '#ffa500': 'orange',
  '#800080': 'purple',
  '#a52a2a': 'brown',
  '#800000': 'maroon',
  '#c0c0c0': 'silver',
};

const resolveColor = (colorStr: string): string => {
  const clean = colorStr.toLowerCase().trim();
  if (clean.startsWith('#')) {
    return hexColorMap[clean] || clean;
  }
  return clean;
};

// ── Perceptual Image Hashing ──

/**
 * Compute a perceptual difference hash (dHash) for an image buffer using sharp.
 * Returns a 64-bit hex string. Similar images produce similar hashes.
 */
export async function computeImageHash(imageBuffer: Buffer): Promise<string> {
  try {
    // Resize to 9x8 grayscale (produces 8x8 = 64 bit differences)
    const pixels = await sharp(imageBuffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Compare each pixel to its right neighbor
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = pixels[row * 9 + col];
        const right = pixels[row * 9 + col + 1];
        hash += left < right ? '1' : '0';
      }
    }

    // Convert binary string to hex
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return '';
  }
}

/**
 * Compute Hamming distance between two hex hash strings.
 * Lower = more similar. 0 = identical. Max = 64.
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    // Count set bits
    distance += ((xor >> 0) & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return distance;
}

// ── Phrase & Bigram Matching Utilities ──

/**
 * Generate bigrams (2-word phrases) from an array of words.
 */
function generateBigrams(words: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

/**
 * Score how well a product matches the AI analysis results.
 * Uses phrase matching, bigram matching, stop-word filtering,
 * and capped description scoring.
 */
function computeProductScore(
  product: any,
  analysis: AIAnalysisResult,
  sensitivity: number,
  uploadedImageHash?: string,
): number {
  let score = 0;
  const labels = analysis.labels || [];
  const category = analysis.category || '';
  const attrs = analysis.attributes || {};

  // Filter out stop words from label words
  const cleanLabelWords = labels
    .flatMap((l) => (l || '').split(/\s+/).map(cleanWord))
    .filter((w) => w.length > 2 && !isStopWord(w));
  const uniqueLabelWords = new Set(cleanLabelWords);

  // Prepare product text fields
  const titleLower = (product.title || '').toLowerCase();
  const titleWords = titleLower
    .split(/\s+/)
    .map(cleanWord)
    .filter((w: string) => w.length > 2 && !isStopWord(w));
  const descLower = (product.description || '').toLowerCase();

  // ── 1. IMAGE HASH MATCH (highest priority) ──
  if (uploadedImageHash && product.imageHash) {
    const dist = hammingDistance(uploadedImageHash, product.imageHash);
    if (dist <= 5) {
      score += 500; // Near-identical image → massive boost
    } else if (dist <= 10) {
      score += 200; // Very similar image
    } else if (dist <= 15) {
      score += 80; // Somewhat similar
    }
  }

  // ── 2. FULL PHRASE MATCH (very high weight) ──
  // Match entire multi-word labels against the title as substrings
  for (const label of labels) {
    if (!label || label.split(/\s+/).length < 2) continue; // Skip single-word labels
    const labelLower = label.toLowerCase();
    if (titleLower.includes(labelLower)) {
      score += 80; // Full phrase found in title = strong signal
    }
  }

  // ── 3. TITLE WORD MATCH (moderate weight, only non-stop words) ──
  let titleWordMatches = 0;
  for (const tWord of titleWords) {
    if (uniqueLabelWords.has(tWord)) {
      titleWordMatches++;
    }
  }
  // Diminishing returns: first 3 matches worth more than subsequent ones
  score += Math.min(titleWordMatches, 3) * 15 + Math.max(0, titleWordMatches - 3) * 5;

  // ── 4. BIGRAM MATCHING (title bigrams vs label bigrams) ──
  const titleBigrams = generateBigrams(titleWords);
  const labelBigrams = generateBigrams(cleanLabelWords);
  const labelBigramSet = new Set(labelBigrams);
  let bigramMatches = 0;
  for (const tb of titleBigrams) {
    if (labelBigramSet.has(tb)) {
      bigramMatches++;
    }
  }
  score += bigramMatches * 25;

  // ── 5. AI TAGS MATCH ──
  if (product.aiTags && Array.isArray(product.aiTags)) {
    // Phrase match: check if any AI label is fully contained in an aiTag or vice versa
    for (const label of labels) {
      if (!label) continue;
      const labelLower = label.toLowerCase();
      for (const tag of product.aiTags) {
        const tagLower = (tag || '').toLowerCase();
        if (tagLower.includes(labelLower) || labelLower.includes(tagLower)) {
          score += 20;
          break;
        }
      }
    }

    // Word-level aiTag matches (filtered)
    const aiTagsClean = product.aiTags
      .map((t: string) => cleanWord(t))
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    let aiTagMatches = 0;
    for (const tag of aiTagsClean) {
      if (uniqueLabelWords.has(tag)) {
        aiTagMatches++;
      }
    }
    score += Math.min(aiTagMatches, 5) * 10;
  }

  // ── 6. CATEGORY MATCH ──
  const productCategory = (product.category || '').toLowerCase();
  const aiCatLower = category.toLowerCase();
  if (productCategory === aiCatLower) {
    score += 30;
  } else {
    const prodCatWords = productCategory
      .split(/[\s_-]+/)
      .map(cleanWord)
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    const aiCatWords = aiCatLower
      .split(/[\s_-]+/)
      .map(cleanWord)
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    const uniqueAiCatWords = new Set(aiCatWords);
    let catMatches = 0;
    for (const cWord of prodCatWords) {
      if (uniqueAiCatWords.has(cWord)) {
        catMatches++;
      }
    }
    if (catMatches > 0) score += 15;
  }

  if (product.aiCategory) {
    if (product.aiCategory.toLowerCase() === aiCatLower) {
      score += 20;
    }
  }

  // ── 7. TAGS MATCH (product.tags) ──
  if (product.tags && Array.isArray(product.tags)) {
    const productTagsClean = product.tags
      .map((t: string) => cleanWord(t))
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    let tagMatches = 0;
    for (const tag of productTagsClean) {
      if (uniqueLabelWords.has(tag)) {
        tagMatches++;
      }
    }
    score += Math.min(tagMatches, 5) * 10;
  }

  // ── 8. DESCRIPTION MATCH (capped to prevent noise) ──
  const descWords = descLower
    .split(/\s+/)
    .map(cleanWord)
    .filter((w: string) => w.length > 3 && !isStopWord(w));
  let descWordMatches = 0;
  for (const dWord of descWords) {
    if (uniqueLabelWords.has(dWord)) {
      descWordMatches++;
      if (descWordMatches >= 5) break; // Cap at 5 description matches
    }
  }
  score += descWordMatches * 3;

  // ── 9. MATERIAL MATCH ──
  if (attrs.material && product.material) {
    const matClean = cleanWord(attrs.material);
    const prodMatWords = (product.material || '').split(/[\s,_-]+/).map(cleanWord);
    if (prodMatWords.includes(matClean)) {
      score += 15;
    }
  }

  // ── 10. COLOR MATCH ──
  if (attrs.primaryColor) {
    const colorLower = cleanWord(attrs.primaryColor);
    if (!isStopWord(colorLower)) {
      if (titleWords.includes(colorLower)) score += 10;
    }
  }
  if (attrs.secondaryColor) {
    const colorLower = cleanWord(attrs.secondaryColor);
    if (!isStopWord(colorLower)) {
      if (titleWords.includes(colorLower)) score += 5;
    }
  }

  // ── 11. SHAPE MATCH ──
  if (attrs.shape) {
    const shapeLower = cleanWord(attrs.shape);
    if (titleLower.includes(shapeLower) || descLower.includes(shapeLower)) {
      score += 15;
    }
  }

  // ── 12. Small boost for higher-rated products (tie-breaker only) ──
  score += product.rating || 0;

  return Math.round(score * sensitivity);
}

/**
 * Score how well an event matches the AI analysis results.
 */
function computeEventScore(event: any, analysis: AIAnalysisResult, sensitivity: number): number {
  let score = 0;
  const labels = analysis.labels || [];
  const category = analysis.category || '';
  const attrs = analysis.attributes || {};

  const cleanLabelWords = labels
    .flatMap((l) => (l || '').split(/\s+/).map(cleanWord))
    .filter((w) => w.length > 2 && !isStopWord(w));
  const uniqueLabelWords = new Set(cleanLabelWords);

  const titleLower = (event.title || '').toLowerCase();
  const titleWords = titleLower
    .split(/\s+/)
    .map(cleanWord)
    .filter((w: string) => w.length > 2 && !isStopWord(w));

  // 1. Full phrase match against title
  for (const label of labels) {
    if (!label || label.split(/\s+/).length < 2) continue;
    const labelLower = label.toLowerCase();
    if (titleLower.includes(labelLower)) {
      score += 80;
    }
  }

  // 2. Title word match
  let titleWordMatches = 0;
  for (const tWord of titleWords) {
    if (uniqueLabelWords.has(tWord)) {
      titleWordMatches++;
    }
  }
  score += Math.min(titleWordMatches, 3) * 15 + Math.max(0, titleWordMatches - 3) * 5;

  // 3. Bigram matching
  const titleBigrams = generateBigrams(titleWords);
  const labelBigrams = generateBigrams(cleanLabelWords);
  const labelBigramSet = new Set(labelBigrams);
  let bigramMatches = 0;
  for (const tb of titleBigrams) {
    if (labelBigramSet.has(tb)) {
      bigramMatches++;
    }
  }
  score += bigramMatches * 25;

  // 4. Category match
  const eventCategory = (event.category || '').toLowerCase();
  const aiCatLower = category.toLowerCase();
  if (eventCategory === aiCatLower) {
    score += 30;
  } else {
    const eventCatWords = eventCategory
      .split(/[\s_-]+/)
      .map(cleanWord)
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    const aiCatWords = aiCatLower
      .split(/[\s_-]+/)
      .map(cleanWord)
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    const uniqueAiCatWords = new Set(aiCatWords);
    let catMatches = 0;
    for (const cWord of eventCatWords) {
      if (uniqueAiCatWords.has(cWord)) {
        catMatches++;
      }
    }
    if (catMatches > 0) score += 15;
  }

  // 5. Style match
  const eventStyle = (event.style || '').toLowerCase();
  if (attrs.style) {
    const styleClean = cleanWord(attrs.style);
    if (cleanWord(eventStyle) === styleClean || eventStyle.includes(styleClean)) {
      score += 15;
    }
  }

  // 6. Features match
  if (event.features && Array.isArray(event.features)) {
    const featuresClean = event.features
      .map((f: string) => cleanWord(f))
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    let featureMatches = 0;
    for (const feat of featuresClean) {
      if (uniqueLabelWords.has(feat)) {
        featureMatches++;
      }
    }
    score += Math.min(featureMatches, 5) * 10;
  }

  // 7. Description match (capped)
  const descLower = (event.description || '').toLowerCase();
  const descWords = descLower
    .split(/\s+/)
    .map(cleanWord)
    .filter((w: string) => w.length > 3 && !isStopWord(w));
  let descWordMatches = 0;
  for (const dWord of descWords) {
    if (uniqueLabelWords.has(dWord)) {
      descWordMatches++;
      if (descWordMatches >= 5) break;
    }
  }
  score += descWordMatches * 3;

  // 8. Color match
  if (attrs.primaryColor) {
    const colorLower = cleanWord(attrs.primaryColor);
    if (!isStopWord(colorLower)) {
      if (titleWords.includes(colorLower)) score += 10;
      if (
        event.colorPalette?.some((c: string) => {
          const resolved = resolveColor(c);
          return resolved.includes(colorLower) || colorLower.includes(resolved);
        })
      ) {
        score += 8;
      }
    }
  }

  // 9. Shape match
  if (attrs.shape) {
    const shapeLower = cleanWord(attrs.shape);
    if (titleLower.includes(shapeLower) || descLower.includes(shapeLower)) {
      score += 15;
    }
  }

  // 10. Base boost (tie-breaker)
  score += 5;

  return Math.round(score * sensitivity);
}

/**
 * Score how well a showcase matches the AI analysis results.
 */
function computeShowcaseScore(
  showcase: any,
  analysis: AIAnalysisResult,
  sensitivity: number,
): number {
  let score = 0;
  const labels = analysis.labels || [];
  const category = analysis.category || '';
  const attrs = analysis.attributes || {};

  const cleanLabelWords = labels
    .flatMap((l) => (l || '').split(/\s+/).map(cleanWord))
    .filter((w) => w.length > 2 && !isStopWord(w));
  const uniqueLabelWords = new Set(cleanLabelWords);

  const titleLower = (showcase.title || '').toLowerCase();
  const titleWords = titleLower
    .split(/\s+/)
    .map(cleanWord)
    .filter((w: string) => w.length > 2 && !isStopWord(w));

  // 1. Full phrase match against title
  for (const label of labels) {
    if (!label || label.split(/\s+/).length < 2) continue;
    const labelLower = label.toLowerCase();
    if (titleLower.includes(labelLower)) {
      score += 80;
    }
  }

  // 2. Title word match
  let titleWordMatches = 0;
  for (const tWord of titleWords) {
    if (uniqueLabelWords.has(tWord)) {
      titleWordMatches++;
    }
  }
  score += Math.min(titleWordMatches, 3) * 15 + Math.max(0, titleWordMatches - 3) * 5;

  // 3. Bigram matching
  const titleBigrams = generateBigrams(titleWords);
  const labelBigrams = generateBigrams(cleanLabelWords);
  const labelBigramSet = new Set(labelBigrams);
  let bigramMatches = 0;
  for (const tb of titleBigrams) {
    if (labelBigramSet.has(tb)) {
      bigramMatches++;
    }
  }
  score += bigramMatches * 25;

  // 4. Category match
  const showcaseCategory = (showcase.category || '').toLowerCase();
  const aiCatLower = category.toLowerCase();
  if (showcaseCategory === aiCatLower) {
    score += 30;
  } else {
    const showCatWords = showcaseCategory
      .split(/[\s_-]+/)
      .map(cleanWord)
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    const aiCatWords = aiCatLower
      .split(/[\s_-]+/)
      .map(cleanWord)
      .filter((w: string) => w.length > 2 && !isStopWord(w));
    const uniqueAiCatWords = new Set(aiCatWords);
    let catMatches = 0;
    for (const cWord of showCatWords) {
      if (uniqueAiCatWords.has(cWord)) {
        catMatches++;
      }
    }
    if (catMatches > 0) score += 15;
  }

  // 5. Style/description match
  const descLower = (showcase.description || '').toLowerCase();
  const descWords = descLower
    .split(/\s+/)
    .map(cleanWord)
    .filter((w: string) => w.length > 3 && !isStopWord(w));
  if (attrs.style) {
    const styleClean = cleanWord(attrs.style);
    if (descWords.includes(styleClean)) {
      score += 15;
    }
  }

  // 6. Inclusions match
  let inclusionWords: string[] = [];
  if (showcase.inclusions && Array.isArray(showcase.inclusions)) {
    inclusionWords = showcase.inclusions
      .flatMap((inc: any) => (inc.name || '').split(/\s+/).map(cleanWord))
      .filter((w: string) => w.length > 2 && !isStopWord(w));

    let inclusionMatches = 0;
    for (const incWord of inclusionWords) {
      if (uniqueLabelWords.has(incWord)) {
        inclusionMatches++;
      }
    }
    score += Math.min(inclusionMatches, 5) * 10;
  }

  // 7. Description match (capped)
  let descWordMatches = 0;
  for (const dWord of descWords) {
    if (uniqueLabelWords.has(dWord)) {
      descWordMatches++;
      if (descWordMatches >= 5) break;
    }
  }
  score += descWordMatches * 3;

  // 8. Color match
  if (attrs.primaryColor) {
    const colorLower = cleanWord(attrs.primaryColor);
    if (!isStopWord(colorLower)) {
      if (titleWords.includes(colorLower) || inclusionWords.includes(colorLower)) score += 10;
      if (
        showcase.colorPalette?.some((c: string) => {
          const resolved = resolveColor(c);
          return resolved.includes(colorLower) || colorLower.includes(resolved);
        })
      ) {
        score += 8;
      }
    }
  }

  // 9. Shape match
  if (attrs.shape) {
    const shapeLower = cleanWord(attrs.shape);
    if (titleLower.includes(shapeLower) || descLower.includes(shapeLower)) {
      score += 15;
    }
  }

  // 10. Base boost (tie-breaker)
  score += (showcase.popularityScore || 0) * 0.05;
  score += 5;

  return Math.round(score * sensitivity);
}

/**
 * Search for matching products, events, and showcases based on AI analysis results.
 */
export async function findMatchingProducts(
  analysis: AIAnalysisResult,
  config: IVisualSearchConfig,
  uploadedImageHash?: string,
): Promise<{
  bestMatch: VisualSearchResult | null;
  similar: VisualSearchResult[];
  related: VisualSearchResult[];
}> {
  const { labels, category, attributes } = analysis;
  const sensitivity = config.searchSensitivity;
  const resultCount = config.resultCount;
  const threshold = config.similarityThreshold;

  // Check match cache
  const cacheKey = `match:${labels.slice(0, 5).join(',')}:${category}`;
  const cached = matchCache.get<{
    bestMatch: VisualSearchResult | null;
    similar: VisualSearchResult[];
    related: VisualSearchResult[];
  }>(cacheKey);
  if (cached) return cached;

  // Build search queries from labels
  const searchTerms = [
    ...new Set(
      [
        ...labels,
        category,
        attributes.material,
        attributes.primaryColor,
        attributes.occasion,
        attributes.style,
      ].filter(Boolean),
    ),
  ].map((t) => t!.toLowerCase());

  // Extract individual words for better partial matching, filtering stop words
  const words = searchTerms
    .flatMap((term) => term.split(/[\s_-]+/))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const uniqueTermsAndWords = [...new Set([...searchTerms, ...words])];

  const regexPatterns = uniqueTermsAndWords
    .slice(0, 20)
    .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  // Query 1: Direct label/tag match
  const labelQuery = {
    isActive: true,
    $or: [
      { title: { $in: regexPatterns } },
      { tags: { $in: regexPatterns } },
      { category: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
      { aiTags: { $in: regexPatterns } },
      { material: { $in: regexPatterns } },
    ],
  };

  // Query 2: Category-based fallback
  const categoryRegex = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const categoryQuery = {
    isActive: true,
    $or: [{ category: categoryRegex }, { aiCategory: categoryRegex }],
  };

  // Event queries
  const eventLabelQuery = {
    isActive: true,
    $or: [
      { title: { $in: regexPatterns } },
      { category: { $in: regexPatterns } },
      { style: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
      { features: { $in: regexPatterns } },
      { materialStyle: { $in: regexPatterns } },
    ],
  };

  const eventCategoryQuery = {
    isActive: true,
    category: categoryRegex,
  };

  // Showcase queries
  const showcaseLabelQuery = {
    isActive: true,
    $or: [
      { title: { $in: regexPatterns } },
      { category: { $in: regexPatterns } },
      { description: { $in: regexPatterns } },
    ],
  };

  const showcaseCategoryQuery = {
    isActive: true,
    category: categoryRegex,
  };

  const [
    labelResults,
    categoryResults,
    eventLabelResults,
    eventCategoryResults,
    showcaseLabelResults,
    showcaseCategoryResults,
  ] = await Promise.all([
    Product.find(labelQuery)
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes imageHash',
      )
      .limit(100)
      .maxTimeMS(8000)
      .lean(),
    Product.find(categoryQuery)
      .select(
        '_id title slug category imageSrc images price oldPrice rating reviews tags description material badges aiTags aiCategory aiAttributes imageHash',
      )
      .limit(50)
      .maxTimeMS(5000)
      .lean(),
    Event.find(eventLabelQuery)
      .select(
        '_id title category style image basePrice description features colorPalette materialStyle gallery',
      )
      .limit(100)
      .maxTimeMS(8000)
      .lean(),
    Event.find(eventCategoryQuery)
      .select(
        '_id title category style image basePrice description features colorPalette materialStyle gallery',
      )
      .limit(50)
      .maxTimeMS(5000)
      .lean(),
    ShowcaseCollection.find(showcaseLabelQuery)
      .select(
        '_id title category description image rentalPrice gallery inclusions colorPalette setupTimeHours popularityScore',
      )
      .limit(100)
      .maxTimeMS(8000)
      .lean(),
    ShowcaseCollection.find(showcaseCategoryQuery)
      .select(
        '_id title category description image rentalPrice gallery inclusions colorPalette setupTimeHours popularityScore',
      )
      .limit(50)
      .maxTimeMS(5000)
      .lean(),
  ]);

  // Merge and deduplicate products
  const productMap = new Map<string, any>();
  for (const p of labelResults) {
    productMap.set(p._id.toString(), p);
  }
  for (const p of categoryResults) {
    const id = p._id.toString();
    if (!productMap.has(id)) {
      productMap.set(id, p);
    }
  }

  // Merge and deduplicate events
  const eventMap = new Map<string, any>();
  for (const e of eventLabelResults) {
    eventMap.set(e._id.toString(), e);
  }
  for (const e of eventCategoryResults) {
    const id = e._id.toString();
    if (!eventMap.has(id)) {
      eventMap.set(id, e);
    }
  }

  // Merge and deduplicate showcases
  const showcaseMap = new Map<string, any>();
  for (const s of showcaseLabelResults) {
    showcaseMap.set(s._id.toString(), s);
  }
  for (const s of showcaseCategoryResults) {
    const id = s._id.toString();
    if (!showcaseMap.has(id)) {
      showcaseMap.set(id, s);
    }
  }

  // Score all products, events, and showcases
  const scored: { item: any; score: number; type: 'product' | 'event' | 'showcase' }[] = [];
  for (const product of productMap.values()) {
    const score = computeProductScore(product, analysis, sensitivity, uploadedImageHash);
    scored.push({ item: product, score, type: 'product' });
  }
  for (const event of eventMap.values()) {
    const score = computeEventScore(event, analysis, sensitivity);
    scored.push({ item: event, score, type: 'event' });
  }
  for (const showcase of showcaseMap.values()) {
    const score = computeShowcaseScore(showcase, analysis, sensitivity);
    scored.push({ item: showcase, score, type: 'showcase' });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Normalize scores to 0-100 percentage.
  // Use the highest score actually found, but at least 80 to avoid inflating noise.
  const maxScore = Math.max(scored[0]?.score || 1, 80);

  const formatResult = (
    entry: { item: any; score: number; type: 'product' | 'event' | 'showcase' },
    maxS: number,
  ): VisualSearchResult => {
    if (entry.type === 'event') {
      return {
        id: entry.item._id.toString(),
        title: entry.item.title,
        slug: entry.item._id.toString(),
        category: entry.item.category,
        imageSrc: entry.item.image,
        images: entry.item.gallery || [],
        price: entry.item.basePrice,
        rating: 4.9,
        reviews: 0,
        tags: entry.item.features || [],
        description: entry.item.description || '',
        similarityScore: Math.round((entry.score / maxS) * 100),
        matchSource:
          entry.score > maxS * 0.7
            ? 'visual_match'
            : entry.score > maxS * 0.4
              ? 'category_match'
              : 'related',
        badges: [],
        itemType: 'event',
      };
    } else if (entry.type === 'showcase') {
      return {
        id: entry.item._id.toString(),
        title: entry.item.title,
        slug: entry.item._id.toString(),
        category: entry.item.category,
        imageSrc: entry.item.image,
        images: entry.item.gallery || [],
        price: entry.item.rentalPrice,
        rating: 4.9,
        reviews: 0,
        tags: [],
        description: entry.item.description || '',
        similarityScore: Math.round((entry.score / maxS) * 100),
        matchSource:
          entry.score > maxS * 0.7
            ? 'visual_match'
            : entry.score > maxS * 0.4
              ? 'category_match'
              : 'related',
        badges: [],
        itemType: 'event',
      };
    } else {
      return {
        id: entry.item._id.toString(),
        title: entry.item.title,
        slug: entry.item.slug,
        category: entry.item.category,
        imageSrc: entry.item.imageSrc,
        images: entry.item.images || [],
        price: entry.item.price,
        oldPrice: entry.item.oldPrice,
        rating: entry.item.rating || 0,
        reviews: entry.item.reviews || 0,
        tags: entry.item.tags || [],
        description: entry.item.description || '',
        similarityScore: Math.round((entry.score / maxS) * 100),
        matchSource:
          entry.score > maxS * 0.7
            ? 'visual_match'
            : entry.score > maxS * 0.4
              ? 'category_match'
              : 'related',
        badges: entry.item.badges || [],
        itemType: 'product',
      };
    }
  };

  // Filter by threshold (convert percentage threshold to absolute)
  const minQualifiedScore = maxScore * threshold;

  // Split into tiers with zero gaps
  const bestMatch =
    scored.length > 0 && scored[0].score >= minQualifiedScore
      ? formatResult(scored[0], maxScore)
      : null;

  const similar = scored
    .slice(bestMatch ? 1 : 0)
    .filter((s) => s.score >= minQualifiedScore)
    .slice(0, resultCount - (bestMatch ? 1 : 0))
    .map((s) => formatResult(s, maxScore));

  const related = scored
    .filter((s) => s.score < minQualifiedScore && s.score > 0)
    .slice(0, 10)
    .map((s) => formatResult(s, maxScore));

  const result = { bestMatch, similar, related };
  matchCache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}

// ══════════════════════════════════════════════
// MAIN VISUAL SEARCH PIPELINE
// ══════════════════════════════════════════════

/**
 * Execute a full visual search: process image → AI analysis → product matching.
 */
export async function executeVisualSearch(
  imageBuffer: Buffer,
  imageMimeType: string,
  options: {
    userId?: string;
    sessionId?: string;
    searchSource?: 'camera' | 'upload' | 'drag_drop';
    ip?: string;
    userAgent?: string;
  } = {},
): Promise<VisualSearchResponse> {
  const startTime = performance.now();

  // 1. Get config
  const config = await getVisualSearchConfig();
  if (!config.enabled) {
    throw new Error('Visual search is currently disabled');
  }

  // 2. Process image (resize + compress)
  const { base64, mimeType, hash } = await processImage(imageBuffer, imageMimeType);

  // 2b. Compute perceptual hash of the uploaded image for image-to-image matching
  let uploadedImageHash = '';
  try {
    uploadedImageHash = await computeImageHash(imageBuffer);
  } catch {
    // Non-critical: image hash comparison just won't work
  }

  // 3. Check analysis cache
  let analysis: AIAnalysisResult;
  const cachedAnalysis = analysisCache.get<AIAnalysisResult>(`analysis:${hash}`);

  // Also check Redis
  let redisCachedAnalysis: AIAnalysisResult | null = null;
  if (!cachedAnalysis) {
    try {
      if (redisClient && redisClient.isReady) {
        const rd = await redisClient.get(`vs:analysis:${hash}`);
        if (rd) redisCachedAnalysis = JSON.parse(rd);
      }
    } catch {
      // Redis unavailable, continue
    }
  }

  if (cachedAnalysis) {
    analysis = cachedAnalysis;
  } else if (redisCachedAnalysis) {
    analysis = redisCachedAnalysis;
    analysisCache.set(`analysis:${hash}`, analysis, 60 * 60 * 1000);
  } else {
    // 4. Send to AI provider with Circuit Breaker
    // Use the decrypted API key from the config model method we added
    const apiKey = (config as any).getDecryptedApiKey?.() || config.provider.apiKey;
    const provider = createVisionProvider(
      config.provider.name,
      apiKey,
      config.provider.endpointUrl,
    );

    try {
      analysis = await aiVisionCircuitBreaker.execute(async () => {
        return await provider.analyzeImage(base64, mimeType);
      });
    } catch (providerError: any) {
      logger.error(`[VISUAL_SEARCH] Primary provider failed: ${providerError.message}`);

      // Auto-fallback to Groq if different provider was primary and circuit breaker fails or provider fails
      if (config.provider.name !== 'groq' && process.env.GROQ_API_KEY) {
        logger.info('[VISUAL_SEARCH] Falling back to Groq Vision');
        const fallback = createVisionProvider('groq', process.env.GROQ_API_KEY);
        // Do not wrap fallback in circuit breaker to ensure at least one attempt goes out if main is tripped
        analysis = await fallback.analyzeImage(base64, mimeType);
      } else {
        throw providerError;
      }
    }

    // Cache the analysis result
    analysisCache.set(`analysis:${hash}`, analysis, 60 * 60 * 1000);
    try {
      if (redisClient && redisClient.isReady) {
        await redisClient.set(`vs:analysis:${hash}`, JSON.stringify(analysis), { EX: 3600 });
      }
    } catch {
      // Redis unavailable
    }
  }

  // 5. Find matching products (pass image hash for perceptual matching)
  const { bestMatch, similar, related } = await findMatchingProducts(
    analysis,
    config,
    uploadedImageHash,
  );

  const searchDurationMs = Math.round(performance.now() - startTime);

  // 6. Log the search (fire and forget)
  if (config.analyticsEnabled) {
    VisualSearchLog.create({
      userId: options.userId,
      sessionId: options.sessionId || crypto.randomUUID(),
      imageHash: hash,
      provider: config.provider.name,
      aiLabels: analysis.labels,
      aiCategory: analysis.category,
      aiConfidence: analysis.confidence,
      aiAttributes: analysis.attributes,
      matchedProductIds: [...(bestMatch ? [bestMatch.id] : []), ...similar.map((s) => s.id)],
      bestMatchProductId: bestMatch?.id,
      resultCount: (bestMatch ? 1 : 0) + similar.length + related.length,
      searchDurationMs,
      searchSource: options.searchSource || 'upload',
      ip: options.ip || '',
      userAgent: options.userAgent || '',
    }).catch((err) => logger.error('[VISUAL_SEARCH] Failed to log search:', err));
  }

  return {
    bestMatch,
    similarProducts: similar,
    relatedProducts: related,
    aiAnalysis: {
      labels: analysis.labels,
      category: analysis.category,
      attributes: analysis.attributes,
      confidence: analysis.confidence,
    },
    totalResults: (bestMatch ? 1 : 0) + similar.length + related.length,
    searchDurationMs,
  };
}

// ══════════════════════════════════════════════
// ADMIN ANALYTICS
// ══════════════════════════════════════════════

export async function getVisualSearchAnalytics(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalSearches,
    successfulSearches,
    averageConfidence,
    topCategories,
    dailyUsage,
    interactionBreakdown,
    averageDuration,
    providerUsage,
  ] = await Promise.all([
    // Total searches
    VisualSearchLog.countDocuments({ createdAt: { $gte: since } }),

    // Successful searches (with results)
    VisualSearchLog.countDocuments({
      createdAt: { $gte: since },
      resultCount: { $gt: 0 },
    }),

    // Average confidence
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$aiConfidence' } } },
    ]),

    // Top searched categories
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since }, aiCategory: { $ne: '' } } },
      { $group: { _id: '$aiCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Daily usage
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // User interaction breakdown
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$userInteraction', count: { $sum: 1 } } },
    ]),

    // Average search duration
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$searchDurationMs' } } },
    ]),

    // Provider usage
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } },
    ]),
  ]);

  const failedSearches = totalSearches - successfulSearches;

  return {
    totalSearches,
    successfulSearches,
    failedSearches,
    successRate: totalSearches > 0 ? Math.round((successfulSearches / totalSearches) * 100) : 0,
    averageConfidence: averageConfidence[0]?.avg ? Math.round(averageConfidence[0].avg * 100) : 0,
    averageDurationMs: averageDuration[0]?.avg ? Math.round(averageDuration[0].avg) : 0,
    topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
    dailyUsage: dailyUsage.map((d) => ({ date: d._id, count: d.count })),
    interactionBreakdown: interactionBreakdown.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    providerUsage: providerUsage.map((p) => ({ provider: p._id, count: p.count })),
    periodDays: days,
  };
}

/**
 * Bulk-generate AI tags for products that don't have them.
 */
export async function bulkGenerateProductTags(
  batchSize: number = 5,
): Promise<{ processed: number; failed: number; total: number }> {
  const config = await getVisualSearchConfig();
  const apiKey = (config as any).getDecryptedApiKey?.() || config.provider.apiKey;
  const provider = createVisionProvider(config.provider.name, apiKey, config.provider.endpointUrl);

  // Find products without aiTags that have images
  const products = await Product.find({
    isActive: true,
    imageSrc: { $exists: true, $ne: '' },
    $or: [{ aiTags: { $exists: false } }, { aiTags: { $size: 0 } }],
  })
    .select('_id title imageSrc category')
    .limit(batchSize)
    .lean();

  const total = products.length;
  let processed = 0;
  let failed = 0;

  for (const product of products) {
    try {
      // Fetch product image
      const imageUrl = product.imageSrc;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        failed++;
        continue;
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { base64, mimeType } = await processImage(buffer, 'image/jpeg');

      // Compute perceptual image hash for image-to-image matching
      let imageHash = '';
      try {
        imageHash = await computeImageHash(buffer);
      } catch {
        // Non-critical
      }

      // Analyze with AI
      const analysis = await provider.analyzeImage(base64, mimeType);

      // Update product with AI tags and image hash
      await Product.findByIdAndUpdate(product._id, {
        aiTags: analysis.labels,
        aiCategory: analysis.category,
        aiAttributes: analysis.attributes,
        ...(imageHash ? { imageHash } : {}),
      });

      processed++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      logger.error(`[VISUAL_SEARCH] Failed to tag product ${product._id}: ${err.message}`);
      failed++;
    }
  }

  return { processed, failed, total };
}
