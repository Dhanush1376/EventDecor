import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { RecommendationCache } from '../../services/recommendation/recommendationCache';
import { getTrendingFeeds } from '../../services/recommendation/trendingEngine';
import { getColdStartFeed } from '../../services/recommendation/coldStartHandler';
import logger from '../../config/logger';

export const getHomepageSections = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id?.toString() || (req.query.userId as string);
  const _sessionId =
    (req.headers['x-session-id'] as string) ||
    (req.query.sessionId as string) ||
    'anonymous-session';

  const { recommendationQueue, isQueuesReady } = require('../../jobs/queues');

  // 1. Handpicked For You (homepage)
  let curatedItems: any[] = [];
  // curatedSource is unused
  let curatedFromCache = false;

  if (userId) {
    const cached = await RecommendationCache.getPersonalFeed(userId, 'homepage');
    if (cached) {
      curatedItems = cached.items || cached;
      // _curatedSource = cached.source || 'personalized';
      curatedFromCache = true;
    } else {
      // Trigger background job
      if (isQueuesReady()) {
        recommendationQueue
          .add('rebuild-user-feed', { userId, page: 'homepage' }, { priority: 2 })
          .catch((err: any) => {
            logger.error(
              `[SECTION API] Failed to enqueue rebuild-user-feed homepage: ${err.message}`,
            );
          });
      }
    }
  }

  // Fallback for curated
  if (curatedItems.length === 0) {
    const trending = await getTrendingFeeds().catch(() => null);
    if (trending && trending.trendingNow) {
      curatedItems = trending.trendingNow.slice(0, 8);
    } else {
      curatedItems = await getColdStartFeed({ limit: 8 }).catch(() => []);
    }
    // Enrich fallback items
    const { enrichScoredItems } = require('../../services/recommendation/recommendationEngine');
    curatedItems = await enrichScoredItems(
      curatedItems.map((i) => ({
        targetId: i.targetId || i._id,
        targetType: i.targetType,
        score: i.score,
      })),
    );
  }

  // 2. Trending This Season
  let trendingItems: any[] = [];
  const trendingFeeds = await getTrendingFeeds().catch(() => null);
  if (trendingFeeds && trendingFeeds.trendingNow) {
    const { enrichScoredItems } = require('../../services/recommendation/recommendationEngine');
    trendingItems = await enrichScoredItems(
      trendingFeeds.trendingNow
        .slice(0, 8)
        .map((i) => ({ targetId: i.targetId, targetType: i.targetType, score: i.score })),
    );
  }

  // 3. Inspired By Your Style
  let styleItems: any[] = [];
  let styleFromCache = false;

  if (userId) {
    const cached = await RecommendationCache.getPersonalFeed(userId, 'style');
    if (cached) {
      styleItems = cached.items || cached;
      styleFromCache = true;
    } else {
      // Trigger background job
      if (isQueuesReady()) {
        recommendationQueue
          .add('rebuild-user-feed', { userId, page: 'style' }, { priority: 2 })
          .catch((err: any) => {
            logger.error(`[SECTION API] Failed to enqueue rebuild-user-feed style: ${err.message}`);
          });
      }
    }
  }

  const sections = [];

  if (curatedItems.length > 0) {
    sections.push({
      key: 'for-you',
      title: 'Handpicked For You',
      badge: 'Personalized',
      items: curatedItems,
      fromCache: curatedFromCache,
    });
  }

  if (trendingItems.length > 0) {
    sections.push({
      key: 'trending',
      title: 'Trending This Season',
      badge: 'Hot',
      items: trendingItems,
    });
  }

  if (styleItems.length > 0) {
    sections.push({
      key: 'style-match',
      title: 'Inspired By Your Style',
      badge: 'Style Match',
      items: styleItems,
      fromCache: styleFromCache,
    });
  }

  res.status(200).json(new ApiResponse(true, 'Homepage sections generated', { sections }));
});
