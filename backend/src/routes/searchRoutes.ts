import { Router } from 'express';
import {
  autocomplete,
  searchResults,
  trendingSearches,
  relatedSearches,
} from '../controllers/searchController';
import { searchLimiter } from '../middleware/rateLimiter';
import { redisResponseCache } from '../middleware/redisResponseCache';

const router = Router();

// Autocomplete — fast, lightweight
router.get('/autocomplete', searchLimiter, autocomplete);

// Full search with filtering and pagination
router.get('/results', searchLimiter, redisResponseCache(120), searchResults);

// Trending search terms
router.get('/trending', searchLimiter, trendingSearches);

// Related/similar search suggestions
router.get('/related', searchLimiter, relatedSearches);

export default router;
