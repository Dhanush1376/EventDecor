import UserInteraction from '../../models/UserInteraction';
import logger from '../../config/logger';

/**
 * Signal weights for scoring user affinity toward items.
 * Each signal has a base weight and a decay half-life in days.
 */
const SIGNAL_WEIGHTS: Record<string, { weight: number; halfLifeDays: number }> = {
  purchase: { weight: 10, halfLifeDays: 30 },
  booking: { weight: 10, halfLifeDays: 30 },
  wishlist_add: { weight: 7, halfLifeDays: 14 },
  cart_add: { weight: 6, halfLifeDays: 7 },
  review_submit: { weight: 5, halfLifeDays: 30 },
  product_click: { weight: 3, halfLifeDays: 3 },
  event_click: { weight: 3, halfLifeDays: 3 },
  gallery_click: { weight: 2, halfLifeDays: 3 },
  product_view: { weight: 1.5, halfLifeDays: 3 },
  event_view: { weight: 1.5, halfLifeDays: 3 },
  gallery_view: { weight: 1, halfLifeDays: 3 },
  showcase_view: { weight: 1, halfLifeDays: 3 },
  search: { weight: 4, halfLifeDays: 7 },
  category_explore: { weight: 2, halfLifeDays: 5 },
  review_read: { weight: 0.5, halfLifeDays: 3 },
};

/**
 * Compute time-decay factor: weight × e^(-λ × daysSinceEvent)
 * where λ = ln(2) / halfLifeDays
 */
function computeDecayedWeight(eventType: string, daysSinceEvent: number): number {
  const config = SIGNAL_WEIGHTS[eventType];
  if (!config) return 0;

  const lambda = Math.LN2 / config.halfLifeDays;
  return config.weight * Math.exp(-lambda * daysSinceEvent);
}

/**
 * Bonus weight for repeated views (dwell time signals interest).
 */
function computeDwellBonus(dwellTimeMs?: number): number {
  if (!dwellTimeMs) return 0;
  if (dwellTimeMs > 60000) return 3; // >1 minute
  if (dwellTimeMs > 30000) return 2; // >30 seconds
  if (dwellTimeMs > 10000) return 1; // >10 seconds
  return 0;
}

export interface ScoredItem {
  targetId: string;
  targetType: string;
  score: number;
  signals: Record<string, number>;
}

/**
 * Score items for a specific user based on their behavioral history.
 * Returns items sorted by score descending.
 */
export async function scoreItemsForUser(
  userId: string,
  candidateIds: string[],
  options: { lookbackDays?: number; limit?: number } = {},
): Promise<ScoredItem[]> {
  const lookbackDays = options.lookbackDays || 90;
  const limit = options.limit || 50;
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  try {
    // Fetch user interactions for the candidate items
    const interactions = await UserInteraction.find({
      userId,
      targetId: { $in: candidateIds },
      timestamp: { $gte: cutoff },
    })
      .select('targetId targetType eventType metadata.dwellTimeMs timestamp')
      .limit(500) // Cap to prevent memory spikes on power users
      .maxTimeMS(3000)
      .lean();

    // Group interactions by targetId and accumulate scores
    const scoreMap = new Map<string, ScoredItem>();

    for (const interaction of interactions) {
      const targetIdStr = interaction.targetId.toString();
      const daysSince =
        (Date.now() - new Date(interaction.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const decayedWeight = computeDecayedWeight(interaction.eventType, daysSince);
      const dwellBonus = computeDwellBonus(interaction.metadata?.dwellTimeMs);

      if (!scoreMap.has(targetIdStr)) {
        scoreMap.set(targetIdStr, {
          targetId: targetIdStr,
          targetType: interaction.targetType,
          score: 0,
          signals: {},
        });
      }

      const entry = scoreMap.get(targetIdStr)!;
      entry.score += decayedWeight + dwellBonus;
      entry.signals[interaction.eventType] = (entry.signals[interaction.eventType] || 0) + 1;
    }

    // Add candidates with no interactions (score = 0)
    for (const id of candidateIds) {
      if (!scoreMap.has(id)) {
        scoreMap.set(id, { targetId: id, targetType: 'product', score: 0, signals: {} });
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (err: any) {
    logger.error(`[SCORING ENGINE] Error scoring items for user ${userId}: ${err.message}`);
    return candidateIds.slice(0, limit).map((id) => ({
      targetId: id,
      targetType: 'product',
      score: 0,
      signals: {},
    }));
  }
}

/**
 * Score items based on a session's behavioral context (for guests or real-time adaptation).
 */
export async function scoreItemsForSession(
  sessionId: string,
  candidateIds: string[],
  options: { lookbackMinutes?: number; limit?: number } = {},
): Promise<ScoredItem[]> {
  const lookbackMinutes = options.lookbackMinutes || 180; // 3 hours — event decor users browse extensively
  const limit = options.limit || 50;
  const cutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  try {
    const interactions = await UserInteraction.find({
      sessionId,
      targetId: { $in: candidateIds },
      timestamp: { $gte: cutoff },
    })
      .select('targetId targetType eventType metadata.dwellTimeMs timestamp')
      .limit(500) // Cap to prevent memory spikes
      .maxTimeMS(3000)
      .lean();

    const scoreMap = new Map<string, ScoredItem>();

    for (const interaction of interactions) {
      const targetIdStr = interaction.targetId.toString();
      // Use shorter decay for session-based scoring (minutes vs days)
      const minutesSince = (Date.now() - new Date(interaction.timestamp).getTime()) / (1000 * 60);
      const recencyBoost = Math.max(0.1, 1 - minutesSince / lookbackMinutes);
      const config = SIGNAL_WEIGHTS[interaction.eventType];
      const weight = config ? config.weight * recencyBoost : 0;
      const dwellBonus = computeDwellBonus(interaction.metadata?.dwellTimeMs);

      if (!scoreMap.has(targetIdStr)) {
        scoreMap.set(targetIdStr, {
          targetId: targetIdStr,
          targetType: interaction.targetType,
          score: 0,
          signals: {},
        });
      }

      const entry = scoreMap.get(targetIdStr)!;
      entry.score += weight + dwellBonus;
      entry.signals[interaction.eventType] = (entry.signals[interaction.eventType] || 0) + 1;
    }

    for (const id of candidateIds) {
      if (!scoreMap.has(id)) {
        scoreMap.set(id, { targetId: id, targetType: 'product', score: 0, signals: {} });
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (err: any) {
    logger.error(`[SCORING ENGINE] Error scoring items for session ${sessionId}: ${err.message}`);
    return candidateIds.slice(0, limit).map((id) => ({
      targetId: id,
      targetType: 'product',
      score: 0,
      signals: {},
    }));
  }
}

/**
 * Compute the overall engagement score for a user (0-100).
 * Used for profile building.
 */
export async function computeEngagementScore(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const result = await UserInteraction.aggregate([
      { $match: { userId, timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          totalInteractions: { $sum: 1 },
          uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
          highValueEvents: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$eventType',
                    ['purchase', 'booking', 'wishlist_add', 'cart_add', 'review_submit'],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!result.length) return 0;

    const { totalInteractions, uniqueDays, highValueEvents } = result[0];
    const activeDays = uniqueDays.length;

    // Score components (each 0-25, total 0-100)
    const frequencyScore = Math.min(25, (totalInteractions / 50) * 25);
    const consistencyScore = Math.min(25, (activeDays / 15) * 25);
    const qualityScore = Math.min(25, (highValueEvents / 5) * 25);
    const recencyScore = 25; // They interacted in last 30 days = full recency

    return Math.round(frequencyScore + consistencyScore + qualityScore + recencyScore);
  } catch (err: any) {
    logger.error(`[SCORING ENGINE] Error computing engagement for ${userId}: ${err.message}`);
    return 0;
  }
}
