import UserInteraction from '../../models/UserInteraction';
import logger from '../../config/logger';
import { getSearchCache, setSearchCache } from './SearchCacheService';
import { SYNONYM_MAP, TRANSLITERATION_MAP } from './searchDictionaries';
import { predictCategories } from './SearchQueryBuilder';

/**
 * Calculates Levenshtein distance for fuzzy matching deduplication.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
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
 * Get trending search terms based on user interaction aggregation.
 */
export async function getTrendingSearches(
  options: { limit?: number; days?: number } = {},
): Promise<{ query: string; count: number }[]> {
  const limit = options.limit || 10;
  const days = options.days || 7;

  const cacheKey = `trending_${limit}_${days}`;
  const cached = await getSearchCache<{ query: string; count: number }[]>('trending', cacheKey);
  if (cached) return cached;

  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const results = await UserInteraction.aggregate([
      {
        $match: {
          eventType: 'search',
          timestamp: { $gte: cutoff },
          'metadata.searchQuery': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: { $toLower: '$metadata.searchQuery' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit * 2 },
    ]);

    const seen = new Set<string>();
    const trending: { query: string; count: number }[] = [];

    for (const r of results) {
      const normalized = r._id.trim();
      if (normalized.length < 2) continue;

      const isDuplicate = Array.from(seen).some(
        (existing) =>
          existing.includes(normalized) ||
          normalized.includes(existing) ||
          levenshteinDistance(existing, normalized) <= 2,
      );

      if (!isDuplicate) {
        seen.add(normalized);
        trending.push({ query: normalized, count: r.count });
      }

      if (trending.length >= limit) break;
    }

    await setSearchCache('trending', cacheKey, trending, 15 * 60 * 1000);
    return trending;
  } catch (err: any) {
    logger.error(`[SEARCH Trending] Error: ${err.message}`);
    return [];
  }
}

/**
 * Get related searches based on synonym matching.
 */
export async function getRelatedSearches(
  query: string,
  options: { limit?: number } = {},
): Promise<string[]> {
  const limit = options.limit || 5;
  const normalized = query.trim().toLowerCase();

  const related: string[] = [];
  const words = normalized.split(/\s+/);

  for (const word of words) {
    const synonyms = SYNONYM_MAP[word] || TRANSLITERATION_MAP[word];
    if (synonyms) {
      for (const syn of synonyms.slice(0, 2)) {
        const suggestion = normalized.replace(word, syn);
        if (suggestion !== normalized) {
          related.push(suggestion);
        }
      }
    }
  }

  const predicted = predictCategories(normalized);
  for (const cat of predicted.slice(0, 2)) {
    related.push(`${cat.toLowerCase()} decor`);
    related.push(`${cat.toLowerCase()} decoration ideas`);
  }

  return [...new Set(related)].slice(0, limit);
}
