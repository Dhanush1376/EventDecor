import AnalyticsEvent from '../../models/AnalyticsEvent';
import { SYNONYM_MAP } from '../search/searchDictionaries';
import { analyticsCache } from '../../utils/cache/MemoryCache';

export class SearchIntelligenceService {
  /**
   * Classifies a raw search query into an intent category.
   */
  static classifySearchIntent(query: string): string {
    const lowerQuery = query.toLowerCase().trim();

    // Quick exact matches
    if (
      lowerQuery.includes('wedding') ||
      lowerQuery.includes('mandap') ||
      lowerQuery.includes('pelli')
    )
      return 'wedding_decor';
    if (lowerQuery.includes('birthday') || lowerQuery.includes('bday')) return 'birthday';
    if (lowerQuery.includes('rent') || lowerQuery.includes('hire')) return 'rental';
    if (lowerQuery.includes('premium') || lowerQuery.includes('luxury')) return 'premium';
    if (lowerQuery.includes('budget') || lowerQuery.includes('cheap')) return 'budget';
    if (
      lowerQuery.includes('diy') ||
      lowerQuery.includes('kit') ||
      lowerQuery.includes('do it yourself')
    )
      return 'diy';
    if (lowerQuery.includes('corporate') || lowerQuery.includes('office')) return 'corporate';
    if (lowerQuery.includes('gift') || lowerQuery.includes('return')) return 'gift';

    // Synonym map checking
    for (const [canonical, variants] of Object.entries(SYNONYM_MAP)) {
      if (lowerQuery === canonical || variants.includes(lowerQuery)) {
        if (canonical === 'wedding') return 'wedding_decor';
        if (canonical === 'birthday') return 'birthday';
        // Add more canonical mappings if needed
      }
    }

    return 'other';
  }

  /**
   * Generates search dashboard metrics for a date range.
   */
  static async getSearchDashboard(startDate: Date, endDate: Date) {
    const cacheKey = `search_dash_${startDate.toISOString()}_${endDate.toISOString()}`;
    return analyticsCache.getOrSet(
      cacheKey,
      async () => {
        const match = {
          timestamp: { $gte: startDate, $lte: endDate },
          eventType: 'search_bar_use',
        };

        const totalSearches = await AnalyticsEvent.countDocuments(match);

        const topKeywords = await AnalyticsEvent.aggregate([
          { $match: match },
          {
            $group: {
              _id: { $toLower: '$metadata.searchQuery' },
              count: { $sum: 1 },
              intent: { $first: '$metadata.searchIntent' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
          { $project: { query: '$_id', count: 1, intent: 1, _id: 0 } },
        ]);

        const zeroResults = await AnalyticsEvent.aggregate([
          { $match: { ...match, 'metadata.resultCount': 0 } },
          { $group: { _id: { $toLower: '$metadata.searchQuery' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
          { $project: { query: '$_id', count: 1, _id: 0 } },
        ]);

        // Calculate success rates
        const searchSessions = await AnalyticsEvent.distinct('sessionId', match);
        const clickedSessions = await AnalyticsEvent.distinct('sessionId', {
          sessionId: { $in: searchSessions },
          eventType: 'product_click',
          timestamp: { $gte: startDate, $lte: endDate },
        });
        const purchasedSessions = await AnalyticsEvent.distinct('sessionId', {
          sessionId: { $in: searchSessions },
          eventType: 'payment_success',
          timestamp: { $gte: startDate, $lte: endDate },
        });

        return {
          totalSearches,
          topKeywords,
          zeroResults,
          metrics: {
            successRate:
              totalSearches > 0
                ? ((totalSearches - zeroResults.reduce((acc, curr) => acc + curr.count, 0)) /
                    totalSearches) *
                  100
                : 0,
            clickRate:
              searchSessions.length > 0
                ? (clickedSessions.length / searchSessions.length) * 100
                : 0,
            purchaseRate:
              searchSessions.length > 0
                ? (purchasedSessions.length / searchSessions.length) * 100
                : 0,
          },
        };
      },
      900,
    ); // 15 min cache
  }

  static async getSearchIntentBreakdown(startDate: Date, endDate: Date) {
    return AnalyticsEvent.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate }, eventType: 'search_bar_use' } },
      { $group: { _id: '$metadata.searchIntent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { intent: { $ifNull: ['$_id', 'other'] }, count: 1, _id: 0 } },
    ]);
  }
}
