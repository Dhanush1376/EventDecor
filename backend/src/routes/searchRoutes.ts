import { Router } from 'express';
import {
  autocomplete,
  searchResults,
  trendingSearches,
  relatedSearches,
} from '../controllers/searchController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for search: 60 requests/minute per IP
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many search requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Autocomplete — fast, lightweight
router.get('/autocomplete', searchLimiter, autocomplete);

// Full search with filtering and pagination
router.get('/results', searchLimiter, searchResults);

// Trending search terms
router.get('/trending', trendingSearches);

// Related/similar search suggestions
router.get('/related', relatedSearches);

export default router;
