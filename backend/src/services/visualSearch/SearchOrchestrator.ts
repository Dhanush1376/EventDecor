import { AIAnalysisResult } from '../ai/providerFactory';
import { IVisualSearchConfig } from '../../models/VisualSearchConfig';
import { VisualSearchResult } from './types';
import { FeatureExtractor } from './FeatureExtractor';
import { SimilarityMatcher } from './SimilarityMatcher';
import { ProductRepository } from './repositories/ProductRepository';
import { EventRepository } from './repositories/EventRepository';
import { ShowcaseRepository } from './repositories/ShowcaseRepository';

// We reuse the matchCache from where it was defined, or create a new one.
import { MemoryCache } from '../../utils/cache/MemoryCache';

export const matchCache = new MemoryCache({ defaultTtlMs: 5 * 60 * 1000, maxKeys: 200 });

export class SearchOrchestrator {
  private productRepo = new ProductRepository();
  private eventRepo = new EventRepository();
  private showcaseRepo = new ShowcaseRepository();

  async findMatchingProducts(
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

    const cacheKey = `match:${labels.slice(0, 5).join(',')}:${category}`;
    const cached = matchCache.get<{
      bestMatch: VisualSearchResult | null;
      similar: VisualSearchResult[];
      related: VisualSearchResult[];
    }>(cacheKey);
    if (cached) return cached;

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

    const words = searchTerms
      .flatMap((term) => term.split(/[\s_-]+/))
      .filter((word) => word.length > 2 && !FeatureExtractor.isStopWord(word));

    const uniqueTermsAndWords = [...new Set([...searchTerms, ...words])];

    const regexPatterns = uniqueTermsAndWords
      .slice(0, 20)
      .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    const categoryRegex = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [
      labelResults,
      categoryResults,
      eventLabelResults,
      eventCategoryResults,
      showcaseLabelResults,
      showcaseCategoryResults,
    ] = await Promise.all([
      this.productRepo.searchByRegex(regexPatterns, 100),
      this.productRepo.searchByCategory(categoryRegex, 50),
      this.eventRepo.searchByRegex(regexPatterns, 100),
      this.eventRepo.searchByCategory(categoryRegex, 50),
      this.showcaseRepo.searchByRegex(regexPatterns, 100),
      this.showcaseRepo.searchByCategory(categoryRegex, 50),
    ]);

    const productMap = new Map<string, any>();
    for (const p of labelResults) productMap.set(p._id.toString(), p);
    for (const p of categoryResults) {
      const id = p._id.toString();
      if (!productMap.has(id)) productMap.set(id, p);
    }

    const eventMap = new Map<string, any>();
    for (const e of eventLabelResults) eventMap.set(e._id.toString(), e);
    for (const e of eventCategoryResults) {
      const id = e._id.toString();
      if (!eventMap.has(id)) eventMap.set(id, e);
    }

    const showcaseMap = new Map<string, any>();
    for (const s of showcaseLabelResults) showcaseMap.set(s._id.toString(), s);
    for (const s of showcaseCategoryResults) {
      const id = s._id.toString();
      if (!showcaseMap.has(id)) showcaseMap.set(id, s);
    }

    const scored: { item: any; score: number; type: 'product' | 'event' | 'showcase' }[] = [];
    for (const product of productMap.values()) {
      const score = SimilarityMatcher.computeProductScore(
        product,
        analysis,
        sensitivity,
        uploadedImageHash,
      );
      scored.push({ item: product, score, type: 'product' });
    }
    for (const event of eventMap.values()) {
      const score = SimilarityMatcher.computeEventScore(event, analysis, sensitivity);
      scored.push({ item: event, score, type: 'event' });
    }
    for (const showcase of showcaseMap.values()) {
      const score = SimilarityMatcher.computeShowcaseScore(showcase, analysis, sensitivity);
      scored.push({ item: showcase, score, type: 'showcase' });
    }

    scored.sort((a, b) => b.score - a.score);

    const maxScore = Math.max(scored[0]?.score || 1, 80);

    const formatResult = (
      entry: { item: any; score: number; type: 'product' | 'event' | 'showcase' },
      maxS: number,
    ): VisualSearchResult => {
      const similarityScore = Math.round((entry.score / maxS) * 100);
      const matchSource =
        entry.score > maxS * 0.7
          ? 'visual_match'
          : entry.score > maxS * 0.4
            ? 'category_match'
            : 'related';

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
          similarityScore,
          matchSource,
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
          similarityScore,
          matchSource,
          badges: [],
          itemType: 'event', // Kept as 'event' for backwards compatibility based on original code
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
          similarityScore,
          matchSource,
          badges: entry.item.badges || [],
          itemType: 'product',
        };
      }
    };

    const minQualifiedScore = maxScore * threshold;

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
}
