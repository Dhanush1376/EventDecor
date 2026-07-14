import { Router } from 'express';
import {
  autocomplete,
  searchResults,
  trendingSearches,
  relatedSearches,
  discoveryData,
  enterpriseSearch,
  reindexSearch,
} from '../../controllers/discovery/searchController';
import { searchLimiter } from '../../middleware/rateLimiter';
import { dynamicResponseCache } from '../../middleware/dynamicCacheMiddleware';
import { requireAuth, authorize, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Autocomplete — fast, lightweight
router.get('/autocomplete', searchLimiter, autocomplete);

// Full search with filtering and pagination
router.get('/results', searchLimiter, dynamicResponseCache(120, 'public'), searchResults);

// Trending search terms
router.get('/trending', searchLimiter, trendingSearches);

// Comprehensive discovery data (trending, popular, event collections, new arrivals)
router.get('/discovery', searchLimiter, dynamicResponseCache(300, 'public'), discoveryData);

// Related/similar search suggestions
router.get('/related', searchLimiter, relatedSearches);

// Enterprise global search (Admin only)
router.get('/enterprise', requireAdmin, searchLimiter, enterpriseSearch);

// Trigger reindex (Admin only)
router.post('/reindex', requireAdmin, reindexSearch);

export default router;
