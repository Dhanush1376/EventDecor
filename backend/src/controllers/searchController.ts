import { Request, Response } from 'express';
import {
  getAutocomplete,
  searchAll,
  getTrendingSearches,
  getRelatedSearches,
} from '../services/searchService';
import logger from '../config/logger';

/**
 * GET /search/autocomplete?q=...
 * Fast autocomplete suggestions with visual previews.
 */
export const autocomplete = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 8, 12);

    // Sanitize query to prevent XSS or injection in search logs
    const sanitizedQuery = query.replace(/[<>]/g, '').trim();

    if (sanitizedQuery.length < 2) {
      return res.status(200).json({
        success: true,
        data: { suggestions: [], predictedCategories: [] },
      });
    }

    const start = performance.now();
    const result = await getAutocomplete(sanitizedQuery, { limit });
    const latencyMs = Math.round(performance.now() - start);

    res.setHeader('X-Search-Time', `${latencyMs}ms`);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    logger.error(`[SEARCH CTRL] Autocomplete error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get search suggestions',
    });
  }
};

/**
 * GET /search/results?q=...&category=...&type=...&sort=...&page=...&limit=...
 * Full search with fuzzy matching, synonym expansion, and relevance scoring.
 */
export const searchResults = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const category = req.query.category as string;
    const type = req.query.type as string;
    const sort = req.query.sort as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 40);
    const priceMin = req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined;
    const priceMax = req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined;

    // Sanitize query
    const sanitizedQuery = query.replace(/[<>]/g, '').trim();

    if (sanitizedQuery.length < 1) {
      return res.status(200).json({
        success: true,
        data: { items: [], total: 0, page, limit, predictedCategories: [], query: sanitizedQuery },
      });
    }

    const start = performance.now();
    const result = await searchAll(sanitizedQuery, {
      category,
      type,
      sort,
      page,
      limit,
      priceMin,
      priceMax,
    });
    const latencyMs = Math.round(performance.now() - start);

    res.setHeader('X-Search-Time', `${latencyMs}ms`);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    logger.error(`[SEARCH CTRL] Search error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Search failed',
    });
  }
};

/**
 * GET /search/trending
 * Trending search terms based on recent user activity.
 */
export const trendingSearches = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 20);
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 30);

    const trending = await getTrendingSearches({ limit, days });

    return res.status(200).json({
      success: true,
      data: { searches: trending },
    });
  } catch (err: any) {
    logger.error(`[SEARCH CTRL] Trending searches error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to load trending searches',
    });
  }
};

/**
 * GET /search/related?q=...
 * Related search suggestions for a given query.
 */
export const relatedSearches = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 5, 10);

    if (query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: { related: [] },
      });
    }

    const related = await getRelatedSearches(query, { limit });

    return res.status(200).json({
      success: true,
      data: { related },
    });
  } catch (err: any) {
    logger.error(`[SEARCH CTRL] Related searches error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to load related searches',
    });
  }
};
