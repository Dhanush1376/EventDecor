import { AIAnalysisResult } from '../ai/providerFactory';
import { FeatureExtractor } from './FeatureExtractor';

export class SimilarityMatcher {
  static computeProductScore(
    product: any,
    analysis: AIAnalysisResult,
    sensitivity: number,
    uploadedImageHash?: string,
  ): number {
    let score = 0;
    const labels = analysis.labels || [];
    const category = analysis.category || '';
    const attrs = analysis.attributes || {};

    const cleanLabelWords = labels
      .flatMap((l) => (l || '').split(/\s+/).map(FeatureExtractor.cleanWord))
      .filter((w) => w.length > 2 && !FeatureExtractor.isStopWord(w));
    const uniqueLabelWords = new Set(cleanLabelWords);

    const titleLower = (product.title || '').toLowerCase();
    const titleWords = titleLower
      .split(/\s+/)
      .map(FeatureExtractor.cleanWord)
      .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
    const descLower = (product.description || '').toLowerCase();

    if (uploadedImageHash && product.imageHash) {
      const dist = FeatureExtractor.hammingDistance(uploadedImageHash, product.imageHash);
      if (dist <= 5) score += 500;
      else if (dist <= 10) score += 200;
      else if (dist <= 15) score += 80;
    }

    for (const label of labels) {
      if (!label || label.split(/\s+/).length < 2) continue;
      const labelLower = label.toLowerCase();
      if (titleLower.includes(labelLower)) {
        score += 80;
      }
    }

    let titleWordMatches = 0;
    for (const tWord of titleWords) {
      if (uniqueLabelWords.has(tWord)) {
        titleWordMatches++;
      }
    }
    score += Math.min(titleWordMatches, 3) * 15 + Math.max(0, titleWordMatches - 3) * 5;

    const titleBigrams = FeatureExtractor.generateBigrams(titleWords);
    const labelBigrams = FeatureExtractor.generateBigrams(cleanLabelWords);
    const labelBigramSet = new Set(labelBigrams);
    let bigramMatches = 0;
    for (const tb of titleBigrams) {
      if (labelBigramSet.has(tb)) {
        bigramMatches++;
      }
    }
    score += bigramMatches * 25;

    if (product.aiTags && Array.isArray(product.aiTags)) {
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

      const aiTagsClean = product.aiTags
        .map((t: string) => FeatureExtractor.cleanWord(t))
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      let aiTagMatches = 0;
      for (const tag of aiTagsClean) {
        if (uniqueLabelWords.has(tag)) {
          aiTagMatches++;
        }
      }
      score += Math.min(aiTagMatches, 5) * 10;
    }

    const productCategory = (product.category || '').toLowerCase();
    const aiCatLower = category.toLowerCase();
    if (productCategory === aiCatLower) {
      score += 30;
    } else {
      const prodCatWords = productCategory
        .split(/[\s_-]+/)
        .map(FeatureExtractor.cleanWord)
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      const aiCatWords = aiCatLower
        .split(/[\s_-]+/)
        .map(FeatureExtractor.cleanWord)
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
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

    if (product.tags && Array.isArray(product.tags)) {
      const productTagsClean = product.tags
        .map((t: string) => FeatureExtractor.cleanWord(t))
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      let tagMatches = 0;
      for (const tag of productTagsClean) {
        if (uniqueLabelWords.has(tag)) {
          tagMatches++;
        }
      }
      score += Math.min(tagMatches, 5) * 10;
    }

    const descWords = descLower
      .split(/\s+/)
      .map(FeatureExtractor.cleanWord)
      .filter((w: string) => w.length > 3 && !FeatureExtractor.isStopWord(w));
    let descWordMatches = 0;
    for (const dWord of descWords) {
      if (uniqueLabelWords.has(dWord)) {
        descWordMatches++;
        if (descWordMatches >= 5) break;
      }
    }
    score += descWordMatches * 3;

    if (attrs.material && product.material) {
      const matClean = FeatureExtractor.cleanWord(attrs.material);
      const prodMatWords = (product.material || '')
        .split(/[\s,_-]+/)
        .map(FeatureExtractor.cleanWord);
      if (prodMatWords.includes(matClean)) {
        score += 15;
      }
    }

    if (attrs.primaryColor) {
      const colorLower = FeatureExtractor.cleanWord(attrs.primaryColor);
      if (!FeatureExtractor.isStopWord(colorLower)) {
        if (titleWords.includes(colorLower)) score += 10;
      }
    }
    if (attrs.secondaryColor) {
      const colorLower = FeatureExtractor.cleanWord(attrs.secondaryColor);
      if (!FeatureExtractor.isStopWord(colorLower)) {
        if (titleWords.includes(colorLower)) score += 5;
      }
    }

    if (attrs.shape) {
      const shapeLower = FeatureExtractor.cleanWord(attrs.shape);
      if (titleLower.includes(shapeLower) || descLower.includes(shapeLower)) {
        score += 15;
      }
    }

    score += product.rating || 0;

    return Math.round(score * sensitivity);
  }

  static computeEventScore(event: any, analysis: AIAnalysisResult, sensitivity: number): number {
    let score = 0;
    const labels = analysis.labels || [];
    const category = analysis.category || '';
    const attrs = analysis.attributes || {};

    const cleanLabelWords = labels
      .flatMap((l) => (l || '').split(/\s+/).map(FeatureExtractor.cleanWord))
      .filter((w) => w.length > 2 && !FeatureExtractor.isStopWord(w));
    const uniqueLabelWords = new Set(cleanLabelWords);

    const titleLower = (event.title || '').toLowerCase();
    const titleWords = titleLower
      .split(/\s+/)
      .map(FeatureExtractor.cleanWord)
      .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));

    for (const label of labels) {
      if (!label || label.split(/\s+/).length < 2) continue;
      const labelLower = label.toLowerCase();
      if (titleLower.includes(labelLower)) {
        score += 80;
      }
    }

    let titleWordMatches = 0;
    for (const tWord of titleWords) {
      if (uniqueLabelWords.has(tWord)) {
        titleWordMatches++;
      }
    }
    score += Math.min(titleWordMatches, 3) * 15 + Math.max(0, titleWordMatches - 3) * 5;

    const titleBigrams = FeatureExtractor.generateBigrams(titleWords);
    const labelBigrams = FeatureExtractor.generateBigrams(cleanLabelWords);
    const labelBigramSet = new Set(labelBigrams);
    let bigramMatches = 0;
    for (const tb of titleBigrams) {
      if (labelBigramSet.has(tb)) {
        bigramMatches++;
      }
    }
    score += bigramMatches * 25;

    const eventCategory = (event.category || '').toLowerCase();
    const aiCatLower = category.toLowerCase();
    if (eventCategory === aiCatLower) {
      score += 30;
    } else {
      const eventCatWords = eventCategory
        .split(/[\s_-]+/)
        .map(FeatureExtractor.cleanWord)
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      const aiCatWords = aiCatLower
        .split(/[\s_-]+/)
        .map(FeatureExtractor.cleanWord)
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      const uniqueAiCatWords = new Set(aiCatWords);
      let catMatches = 0;
      for (const cWord of eventCatWords) {
        if (uniqueAiCatWords.has(cWord)) {
          catMatches++;
        }
      }
      if (catMatches > 0) score += 15;
    }

    const eventStyle = (event.style || '').toLowerCase();
    if (attrs.style) {
      const styleClean = FeatureExtractor.cleanWord(attrs.style);
      if (
        FeatureExtractor.cleanWord(eventStyle) === styleClean ||
        eventStyle.includes(styleClean)
      ) {
        score += 15;
      }
    }

    if (event.features && Array.isArray(event.features)) {
      const featuresClean = event.features
        .map((f: string) => FeatureExtractor.cleanWord(f))
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      let featureMatches = 0;
      for (const feat of featuresClean) {
        if (uniqueLabelWords.has(feat)) {
          featureMatches++;
        }
      }
      score += Math.min(featureMatches, 5) * 10;
    }

    const descLower = (event.description || '').toLowerCase();
    const descWords = descLower
      .split(/\s+/)
      .map(FeatureExtractor.cleanWord)
      .filter((w: string) => w.length > 3 && !FeatureExtractor.isStopWord(w));
    let descWordMatches = 0;
    for (const dWord of descWords) {
      if (uniqueLabelWords.has(dWord)) {
        descWordMatches++;
        if (descWordMatches >= 5) break;
      }
    }
    score += descWordMatches * 3;

    if (attrs.primaryColor) {
      const colorLower = FeatureExtractor.cleanWord(attrs.primaryColor);
      if (!FeatureExtractor.isStopWord(colorLower)) {
        if (titleWords.includes(colorLower)) score += 10;
        if (
          event.colorPalette?.some((c: string) => {
            const resolved = FeatureExtractor.resolveColor(c);
            return resolved.includes(colorLower) || colorLower.includes(resolved);
          })
        ) {
          score += 8;
        }
      }
    }

    if (attrs.shape) {
      const shapeLower = FeatureExtractor.cleanWord(attrs.shape);
      if (titleLower.includes(shapeLower) || descLower.includes(shapeLower)) {
        score += 15;
      }
    }

    score += 5;

    return Math.round(score * sensitivity);
  }

  static computeShowcaseScore(
    showcase: any,
    analysis: AIAnalysisResult,
    sensitivity: number,
  ): number {
    let score = 0;
    const labels = analysis.labels || [];
    const category = analysis.category || '';
    const attrs = analysis.attributes || {};

    const cleanLabelWords = labels
      .flatMap((l) => (l || '').split(/\s+/).map(FeatureExtractor.cleanWord))
      .filter((w) => w.length > 2 && !FeatureExtractor.isStopWord(w));
    const uniqueLabelWords = new Set(cleanLabelWords);

    const titleLower = (showcase.title || '').toLowerCase();
    const titleWords = titleLower
      .split(/\s+/)
      .map(FeatureExtractor.cleanWord)
      .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));

    for (const label of labels) {
      if (!label || label.split(/\s+/).length < 2) continue;
      const labelLower = label.toLowerCase();
      if (titleLower.includes(labelLower)) {
        score += 80;
      }
    }

    let titleWordMatches = 0;
    for (const tWord of titleWords) {
      if (uniqueLabelWords.has(tWord)) {
        titleWordMatches++;
      }
    }
    score += Math.min(titleWordMatches, 3) * 15 + Math.max(0, titleWordMatches - 3) * 5;

    const titleBigrams = FeatureExtractor.generateBigrams(titleWords);
    const labelBigrams = FeatureExtractor.generateBigrams(cleanLabelWords);
    const labelBigramSet = new Set(labelBigrams);
    let bigramMatches = 0;
    for (const tb of titleBigrams) {
      if (labelBigramSet.has(tb)) {
        bigramMatches++;
      }
    }
    score += bigramMatches * 25;

    const showcaseCategory = (showcase.category || '').toLowerCase();
    const aiCatLower = category.toLowerCase();
    if (showcaseCategory === aiCatLower) {
      score += 30;
    } else {
      const showCatWords = showcaseCategory
        .split(/[\s_-]+/)
        .map(FeatureExtractor.cleanWord)
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      const aiCatWords = aiCatLower
        .split(/[\s_-]+/)
        .map(FeatureExtractor.cleanWord)
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));
      const uniqueAiCatWords = new Set(aiCatWords);
      let catMatches = 0;
      for (const cWord of showCatWords) {
        if (uniqueAiCatWords.has(cWord)) {
          catMatches++;
        }
      }
      if (catMatches > 0) score += 15;
    }

    const descLower = (showcase.description || '').toLowerCase();
    const descWords = descLower
      .split(/\s+/)
      .map(FeatureExtractor.cleanWord)
      .filter((w: string) => w.length > 3 && !FeatureExtractor.isStopWord(w));
    if (attrs.style) {
      const styleClean = FeatureExtractor.cleanWord(attrs.style);
      if (descWords.includes(styleClean)) {
        score += 15;
      }
    }

    let inclusionWords: string[] = [];
    if (showcase.inclusions && Array.isArray(showcase.inclusions)) {
      inclusionWords = showcase.inclusions
        .flatMap((inc: any) => (inc.name || '').split(/\s+/).map(FeatureExtractor.cleanWord))
        .filter((w: string) => w.length > 2 && !FeatureExtractor.isStopWord(w));

      let inclusionMatches = 0;
      for (const incWord of inclusionWords) {
        if (uniqueLabelWords.has(incWord)) {
          inclusionMatches++;
        }
      }
      score += Math.min(inclusionMatches, 5) * 10;
    }

    let descWordMatches = 0;
    for (const dWord of descWords) {
      if (uniqueLabelWords.has(dWord)) {
        descWordMatches++;
        if (descWordMatches >= 5) break;
      }
    }
    score += descWordMatches * 3;

    if (attrs.primaryColor) {
      const colorLower = FeatureExtractor.cleanWord(attrs.primaryColor);
      if (!FeatureExtractor.isStopWord(colorLower)) {
        if (titleWords.includes(colorLower) || inclusionWords.includes(colorLower)) score += 10;
        if (
          showcase.colorPalette?.some((c: string) => {
            const resolved = FeatureExtractor.resolveColor(c);
            return resolved.includes(colorLower) || colorLower.includes(resolved);
          })
        ) {
          score += 8;
        }
      }
    }

    if (attrs.shape) {
      const shapeLower = FeatureExtractor.cleanWord(attrs.shape);
      if (titleLower.includes(shapeLower) || descLower.includes(shapeLower)) {
        score += 15;
      }
    }

    score += (showcase.popularityScore || 0) * 0.05;
    score += 5;

    return Math.round(score * sensitivity);
  }
}
