import { AIAnalysisResult } from '../ai/providerFactory';

export const cleanWord = (w: string): string => w.toLowerCase().trim().replace(/s$/, '');

export const STOP_WORDS = new Set([
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
]);

export const isStopWord = (w: string): boolean => STOP_WORDS.has(w);

export function generateBigrams(words: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

export function computeProductScore(
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

export function computeEventScore(
  event: any,
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

export function computeShowcaseScore(
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

export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    // Count set bits
    distance += ((xor >> 0) & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return distance;
}

export const resolveColor = (colorStr: string): string => {
  const clean = colorStr.toLowerCase().trim();
  if (clean.startsWith('#')) {
    return hexColorMap[clean] || clean;
  }
  return clean;
};

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
