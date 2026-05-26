import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { getPersonalizedRecommendations, RecommendedItem } from '../services/recommendation/recommendationEngine';
import UserPreferenceProfile from '../models/UserPreferenceProfile';

export const getHomepageSections = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id?.toString() || req.query.userId as string;
  const sessionId = req.headers['x-session-id'] as string || req.query.sessionId as string || 'anonymous-session';
  
  // 1. Handpicked For You (Main Personalized Feed)
  const curatedPromise = getPersonalizedRecommendations({
    userId,
    sessionId,
    page: 'homepage',
    limit: 8
  });

  // 2. Trending This Season
  const trendingPromise = getPersonalizedRecommendations({
    userId,
    sessionId,
    page: 'trending',
    limit: 8
  });

  // 3. Inspired By Your Style (if user has profile)
  let stylePromise: Promise<{ items: RecommendedItem[]; source?: string; seasonal?: unknown }> =
    Promise.resolve({ items: [] });
  if (userId) {
    const profile = await UserPreferenceProfile.findOne({ userId }).lean();
    if (profile && Object.keys(profile.styleAffinities || {}).length > 0) {
      // We simulate this by getting standard recommendations but we'll override the title in the frontend
      stylePromise = getPersonalizedRecommendations({
        userId,
        sessionId,
        page: 'style',
        limit: 8
      });
    }
  }

  const [curatedRes, trendingRes, styleRes] = await Promise.all([
    curatedPromise,
    trendingPromise,
    stylePromise
  ]);

  const sections = [];

  if (curatedRes.items.length > 0) {
    sections.push({
      key: 'for-you',
      title: 'Handpicked For You',
      badge: 'Personalized',
      items: curatedRes.items
    });
  }

  if (trendingRes.items.length > 0) {
    sections.push({
      key: 'trending',
      title: 'Trending This Season',
      badge: 'Hot',
      items: trendingRes.items
    });
  }

  if (styleRes.items.length > 0) {
    sections.push({
      key: 'style-match',
      title: 'Inspired By Your Style',
      badge: 'Style Match',
      items: styleRes.items
    });
  }

  res.status(200).json(new ApiResponse(true, 'Homepage sections generated', { sections }));
});
