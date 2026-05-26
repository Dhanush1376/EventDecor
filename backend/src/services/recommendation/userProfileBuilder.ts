import UserInteraction from '../../models/UserInteraction';
import UserPreferenceProfile from '../../models/UserPreferenceProfile';
import { computeEngagementScore } from './scoringEngine';
import logger from '../../config/logger';
import mongoose from 'mongoose';

/**
 * Rebuild the preference profile for a single user.
 * Aggregates 90 days of interactions to compute affinity scores.
 */
export async function rebuildUserProfile(userId: string): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  try {
    const userOid = new mongoose.Types.ObjectId(userId);

    // Aggregate interactions by category
    const categoryAgg = await UserInteraction.aggregate([
      { $match: { userId: userOid, timestamp: { $gte: ninetyDaysAgo } } },
      { $match: { 'metadata.category': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$metadata.category',
          count: { $sum: 1 },
          highValue: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['purchase', 'booking', 'wishlist_add', 'cart_add']] },
                3,
                1,
              ],
            },
          },
        },
      },
      { $sort: { highValue: -1 } },
    ]);

    // Aggregate interactions by style
    const styleAgg = await UserInteraction.aggregate([
      { $match: { userId: userOid, timestamp: { $gte: ninetyDaysAgo } } },
      { $match: { 'metadata.style': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$metadata.style',
          count: { $sum: 1 },
          highValue: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['purchase', 'booking', 'wishlist_add', 'cart_add']] },
                3,
                1,
              ],
            },
          },
        },
      },
      { $sort: { highValue: -1 } },
    ]);

    // Aggregate tag affinities
    const tagAgg = await UserInteraction.aggregate([
      { $match: { userId: userOid, timestamp: { $gte: ninetyDaysAgo } } },
      { $unwind: '$metadata.tags' },
      {
        $group: {
          _id: '$metadata.tags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    // Recent searches
    const recentSearches = await UserInteraction.find({
      userId: userOid,
      eventType: 'search',
      timestamp: { $gte: ninetyDaysAgo },
    })
      .select('metadata.searchQuery')
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Purchase/booking history
    const purchaseAgg = await UserInteraction.aggregate([
      {
        $match: {
          userId: userOid,
          eventType: { $in: ['purchase', 'booking'] },
          timestamp: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          categories: { $addToSet: '$metadata.category' },
          bookingCount: { $sum: { $cond: [{ $eq: ['$eventType', 'booking'] }, 1, 0] } },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    // Total interaction count
    const interactionCount = await UserInteraction.countDocuments({
      userId: userOid,
      timestamp: { $gte: ninetyDaysAgo },
    });

    // Last interaction
    const lastInteraction = await UserInteraction.findOne({ userId: userOid })
      .sort({ timestamp: -1 })
      .select('timestamp')
      .lean();

    // Normalize affinity scores (0-1)
    const maxCategoryScore = categoryAgg.length > 0 ? categoryAgg[0].highValue : 1;
    const categoryAffinities = new Map<string, number>();
    for (const cat of categoryAgg) {
      categoryAffinities.set(cat._id, Math.round((cat.highValue / maxCategoryScore) * 100) / 100);
    }

    const maxStyleScore = styleAgg.length > 0 ? styleAgg[0].highValue : 1;
    const styleAffinities = new Map<string, number>();
    for (const sty of styleAgg) {
      styleAffinities.set(sty._id, Math.round((sty.highValue / maxStyleScore) * 100) / 100);
    }

    const maxTagScore = tagAgg.length > 0 ? tagAgg[0].count : 1;
    const tagAffinities = new Map<string, number>();
    for (const tag of tagAgg) {
      tagAffinities.set(tag._id, Math.round((tag.count / maxTagScore) * 100) / 100);
    }

    // Infer price preference from interaction metadata
    const priceAgg = await UserInteraction.aggregate([
      { $match: { userId: userOid, 'metadata.priceRange': { $exists: true }, timestamp: { $gte: ninetyDaysAgo } } },
      { $group: { _id: '$metadata.priceRange', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const engagementScore = await computeEngagementScore(userId);

    const profileData = {
      categoryAffinities,
      styleAffinities,
      tagAffinities,
      pricePreference: priceAgg.length > 0 ? priceAgg[0]._id : 'unknown',
      engagementScore,
      interactionCount,
      lastInteractionAt: lastInteraction?.timestamp || new Date(),
      topCategories: categoryAgg.slice(0, 5).map((c) => c._id),
      topStyles: styleAgg.slice(0, 3).map((s) => s._id),
      recentSearches: recentSearches
        .map((s) => s.metadata?.searchQuery)
        .filter(Boolean) as string[],
      purchaseHistory: {
        categories: purchaseAgg.length > 0 ? (purchaseAgg[0].categories || []).filter(Boolean) : [],
        avgPrice: 0, // Would need product price join — simplified for now
        totalSpent: 0,
        bookingCount: purchaseAgg.length > 0 ? purchaseAgg[0].bookingCount : 0,
      },
      lastRebuiltAt: new Date(),
    };

    await UserPreferenceProfile.findOneAndUpdate(
      { userId: userOid },
      { $set: profileData, $inc: { profileVersion: 1 } },
      { upsert: true, new: true }
    );

    logger.info(`[PROFILE BUILDER] Rebuilt profile for user ${userId} (${interactionCount} interactions, engagement: ${engagementScore})`);
  } catch (err: any) {
    logger.error(`[PROFILE BUILDER] Error rebuilding profile for ${userId}: ${err.message}`);
  }
}

/**
 * Rebuild profiles for all users who have recent interactions
 * but stale profiles (not rebuilt in last 6 hours).
 */
export async function rebuildStaleProfiles(): Promise<number> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  try {
    // Find users with recent interactions
    const activeUserIds = await UserInteraction.distinct('userId', {
      userId: { $exists: true },
      timestamp: { $gte: ninetyDaysAgo },
    });

    if (activeUserIds.length === 0) return 0;

    // Find which profiles are stale
    const freshProfiles = await UserPreferenceProfile.find({
      userId: { $in: activeUserIds },
      lastRebuiltAt: { $gte: sixHoursAgo },
    })
      .select('userId')
      .lean();

    const freshSet = new Set(freshProfiles.map((p) => p.userId.toString()));
    const staleUserIds = activeUserIds.filter((id) => id && !freshSet.has(id.toString()));

    let rebuilt = 0;
    for (const userId of staleUserIds.slice(0, 50)) {
      // Cap at 50 per batch to avoid overload
      if (userId) {
        await rebuildUserProfile(userId.toString());
        rebuilt++;
      }
    }

    if (rebuilt > 0) {
      logger.info(`[PROFILE BUILDER] Rebuilt ${rebuilt} stale profiles out of ${staleUserIds.length} pending`);
    }

    return rebuilt;
  } catch (err: any) {
    logger.error(`[PROFILE BUILDER] Error in batch rebuild: ${err.message}`);
    return 0;
  }
}
