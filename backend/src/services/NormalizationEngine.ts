import mongoose from 'mongoose';
import CatalogValue from '../models/CatalogValue';
import CatalogSynonym from '../models/CatalogSynonym';
import AiLearningLog from '../models/AiLearningLog';
import logger from '../config/logger';

export interface NormalizedResult {
  valueId?: mongoose.Types.ObjectId;
  displayValue: string;
  status: 'approved' | 'pending' | 'rejected';
  isNew: boolean;
  confidence?: number;
}

export class NormalizationEngine {
  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Calculate fuzzy match similarity percentage (0-100)
   */
  static getSimilarityPercentage(a: string, b: string): number {
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();
    if (aLower === bLower) return 100;
    const maxLen = Math.max(aLower.length, bLower.length);
    if (maxLen === 0) return 100;
    const distance = this.levenshteinDistance(aLower, bLower);
    return Math.round(((maxLen - distance) / maxLen) * 100);
  }

  /**
   * Basic string cleanup: trim, collapse spaces, remove trailing digits
   */
  static textCleanup(val: string): string {
    let clean = val.trim().replace(/\s+/g, ' ');
    // Remove trailing digits like Pink0 -> Pink
    clean = clean.replace(/\d+$/, '').trim();
    return clean;
  }

  /**
   * Convert to Title Case and fix separators
   */
  static normalizeCase(val: string): string {
    let clean = val
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    // Fix separators: Red/Green -> Red & Green
    clean = clean.replace(/\s*\/\s*/g, ' & ');
    clean = clean.replace(/\s*-\s*/g, '-'); // keep hyphenated words together
    return clean;
  }

  static generateSlug(val: string): string {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * 8-Stage Normalization Pipeline for a single attribute value
   */
  static async normalizeValue(
    attrSlug: string,
    rawValue: string,
    aiConfidence: number = 100,
  ): Promise<NormalizedResult> {
    // Stage 1 & 2: Text Cleanup & Case
    let cleanValue = this.textCleanup(rawValue);
    cleanValue = this.normalizeCase(cleanValue);

    if (!cleanValue) {
      return { displayValue: '', status: 'rejected', isNew: false };
    }

    const cleanSlug = this.generateSlug(cleanValue);

    // Stage 3: AI Learning Memory Check
    const learningLog = await AiLearningLog.findOne({
      attributeSlug: attrSlug,
      originalValue: cleanValue,
    });

    if (learningLog && learningLog.correctedValueId) {
      const canonical = await CatalogValue.findById(learningLog.correctedValueId);
      if (canonical) {
        return {
          valueId: canonical._id as mongoose.Types.ObjectId,
          displayValue: canonical.value,
          status: canonical.status,
          isNew: false,
        };
      }
    }

    // Stage 4: Synonym Resolution
    const synonym = await CatalogSynonym.findOne({
      attributeSlug: attrSlug,
      termSlug: cleanSlug,
      type: 'synonym',
    }).populate('valueId');

    if (synonym && synonym.valueId) {
      const canonical = synonym.valueId as any;
      return {
        valueId: canonical._id,
        displayValue: canonical.value,
        status: canonical.status,
        isNew: false,
      };
    }

    // Stage 5: Exact Match
    const exactMatch = await CatalogValue.findOne({
      attributeSlug: attrSlug,
      slug: cleanSlug,
    });

    if (exactMatch) {
      return {
        valueId: exactMatch._id as mongoose.Types.ObjectId,
        displayValue: exactMatch.value,
        status: exactMatch.status,
        isNew: false,
      };
    }

    // Stage 6: Fuzzy Match
    const allValues = await CatalogValue.find({ attributeSlug: attrSlug });
    let bestMatch = null;
    let highestSim = 0;

    for (const cv of allValues) {
      const sim = this.getSimilarityPercentage(cleanValue, cv.value);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = cv;
      }
    }

    // Stage 7 & 8: Decision Router
    if (bestMatch && highestSim >= 90) {
      // Auto-merge
      return {
        valueId: bestMatch._id as mongoose.Types.ObjectId,
        displayValue: bestMatch.value,
        status: bestMatch.status,
        isNew: false,
      };
    }

    const finalStatus: 'approved' | 'pending' | 'rejected' = 'pending';
    const confidenceReasons = [];

    if (bestMatch && highestSim >= 70 && highestSim < 90) {
      confidenceReasons.push(`Fuzzy matched '${bestMatch.value}' with ${highestSim}% similarity`);
    }

    if (aiConfidence < 70) {
      confidenceReasons.push(`Low AI confidence: ${aiConfidence}%`);
    }

    if (highestSim < 70 && aiConfidence >= 70) {
      // Create as pending
    }

    // Create new CatalogValue as pending
    const newValue = new CatalogValue({
      attributeSlug: attrSlug,
      value: cleanValue,
      slug: cleanSlug,
      status: finalStatus,
      confidence: aiConfidence,
      confidenceReasons,
      createdBy: 'ai',
      isVisible: true,
      usageCount: 0,
      version: 1,
    });

    try {
      const saved = await newValue.save();
      return {
        valueId: saved._id as mongoose.Types.ObjectId,
        displayValue: saved.value,
        status: saved.status,
        isNew: true,
        confidence: aiConfidence,
      };
    } catch (err: any) {
      // Handle race condition if created concurrently
      if (err.code === 11000) {
        const existing = await CatalogValue.findOne({ attributeSlug: attrSlug, slug: cleanSlug });
        if (existing) {
          return {
            valueId: existing._id as mongoose.Types.ObjectId,
            displayValue: existing.value,
            status: existing.status,
            isNew: false,
          };
        }
      }
      logger.error(`[NormalizationEngine] Error saving new CatalogValue: ${err.message}`);
      return { displayValue: cleanValue, status: 'pending', isNew: true };
    }
  }

  /**
   * Batch normalize a list of values
   */
  static async normalizeValueList(attrSlug: string, values: string[]): Promise<string[]> {
    if (!values || !Array.isArray(values)) return [];
    const normalized: string[] = [];
    for (const val of values) {
      if (!val) continue;
      const res = await this.normalizeValue(attrSlug, val);
      if (res.displayValue && !normalized.includes(res.displayValue)) {
        normalized.push(res.displayValue);
      }
    }
    return normalized;
  }

  /**
   * Batch normalize product variants
   */
  static async normalizeVariants(variants: any[]): Promise<any[]> {
    if (!variants || !Array.isArray(variants)) return [];
    const result: any[] = [];
    for (const variant of variants) {
      if (!variant.name || !variant.value) {
        result.push(variant);
        continue;
      }
      const attrSlug = this.generateSlug(variant.name);
      // Ensure we only normalize known attributes to avoid polluting with random fields
      if (['color', 'size', 'material'].includes(attrSlug)) {
        const res = await this.normalizeValue(attrSlug, variant.value);
        result.push({
          ...variant,
          value: res.displayValue,
          valueId: res.valueId,
        });
      } else {
        result.push({
          ...variant,
          value: this.normalizeCase(this.textCleanup(variant.value)),
        });
      }
    }
    return result;
  }

  /**
   * Batch normalize tags
   */
  static async normalizeTags(
    tags: string[],
  ): Promise<{ tagIds: mongoose.Types.ObjectId[]; displayTags: string[] }> {
    if (!tags || !Array.isArray(tags)) return { tagIds: [], displayTags: [] };
    const tagIds: mongoose.Types.ObjectId[] = [];
    const displayTags: string[] = [];
    for (const tag of tags) {
      if (!tag) continue;
      const res = await this.normalizeValue('tag', tag);
      if (res.displayValue && !displayTags.includes(res.displayValue)) {
        displayTags.push(res.displayValue);
        if (res.valueId) tagIds.push(res.valueId);
      }
    }
    return { tagIds, displayTags };
  }

  /**
   * Normalize material string
   */
  static async normalizeMaterial(material: string): Promise<string> {
    if (!material) return '';
    const res = await this.normalizeValue('material', material);
    return res.displayValue;
  }

  /**
   * Record an admin correction
   */
  static async recordLearning(
    attrSlug: string,
    original: string,
    correctedId: mongoose.Types.ObjectId,
    correctedValue: string,
    actorId?: mongoose.Types.ObjectId,
  ): Promise<void> {
    const cleanOriginal = this.normalizeCase(this.textCleanup(original));
    if (cleanOriginal === correctedValue) return;

    try {
      await AiLearningLog.findOneAndUpdate(
        { attributeSlug: attrSlug, originalValue: cleanOriginal },
        {
          $inc: { correctionCount: 1 },
          $set: {
            correctedValue: correctedValue,
            correctedValueId: correctedId,
            lastCorrectedAt: new Date(),
            lastCorrectedBy: actorId,
          },
        },
        { upsert: true, new: true },
      );
    } catch (err: any) {
      logger.error(`[NormalizationEngine] Failed to record learning: ${err.message}`);
    }
  }
}
