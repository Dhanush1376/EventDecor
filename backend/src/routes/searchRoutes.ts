import { Router } from 'express';
import {
  autocomplete,
  searchResults,
  trendingSearches,
  relatedSearches,
} from '../controllers/searchController';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

// Autocomplete — fast, lightweight
router.get('/autocomplete', searchLimiter, autocomplete);

// Full search with filtering and pagination
router.get('/results', searchLimiter, searchResults);

// Trending search terms
router.get('/trending', searchLimiter, trendingSearches);

// Related/similar search suggestions
router.get('/related', searchLimiter, relatedSearches);

export default router;
