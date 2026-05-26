import logger from '../../config/logger';

/**
 * ExplorationEngine - Balances exploration (showing new/diverse items)
 * and exploitation (showing items the user has high affinity for).
 * Uses an ε-greedy approach combined with novelty scoring.
 *
 * Key design decisions:
 * - Seeded shuffling ensures deterministic daily ordering (no flickering)
 * - Novelty bonus modifies `rawScore` (the field used for final sorting)
 * - Adaptive epsilon uses actual profile engagement data
 */
class ExplorationEngine {
  private epsilon: number; // Base probability of exploring

  constructor(baseEpsilon: number = 0.2) {
    this.epsilon = baseEpsilon;
  }

  /**
   * Dynamically adjust epsilon based on user engagement.
   * Uses actual profile fields: engagementScore and interactionCount.
   */
  public getAdaptiveEpsilon(userProfileOrSession: any): number {
    let currentEpsilon = this.epsilon;

    if (!userProfileOrSession) return currentEpsilon;

    // High engagement → exploit more (user knows what they want)
    const engagement = userProfileOrSession.engagementScore ?? 0;
    if (engagement > 60) {
      currentEpsilon -= 0.1;
    } else if (engagement < 20) {
      currentEpsilon += 0.1; // Low engagement → explore more (user is browsing)
    }

    // Many interactions → exploit more
    const interactionCount = userProfileOrSession.interactionCount ?? 0;
    if (interactionCount > 20) {
      currentEpsilon -= 0.05;
    } else if (interactionCount < 5) {
      currentEpsilon += 0.05; // Few interactions → show diverse options
    }

    // Clamp between 0.05 (mostly exploit) and 0.5 (heavy explore)
    return Math.max(0.05, Math.min(0.5, currentEpsilon));
  }

  /**
   * Apply exploration vs exploitation to a ranked list of items.
   * Epsilon % of the final list will be "exploration" items drawn from
   * diverse categories or novel items the user hasn't seen.
   *
   * Uses seeded shuffling so the same user sees the same ordering within
   * a day — eliminates recommendation "flickering" on page re-renders.
   */
  public balanceList(
    rankedExploitItems: any[],
    diverseExplorePool: any[],
    targetLimit: number,
    userProfileOrSession: any
  ): any[] {
    const adaptiveEps = this.getAdaptiveEpsilon(userProfileOrSession);
    const exploreCount = Math.floor(targetLimit * adaptiveEps);
    const exploitCount = targetLimit - exploreCount;

    // Take top N from the ranked exploit list
    const finalExploit = rankedExploitItems.slice(0, exploitCount);

    // Filter out items already in the exploit list from the explore pool
    const exploitIds = new Set(finalExploit.map((item) => item._id?.toString()));
    const validExplorePool = diverseExplorePool.filter(
      (item) => !exploitIds.has(item._id?.toString())
    );

    // Deterministic daily seed based on user ID (or 'anonymous')
    const userId = userProfileOrSession?.userId?.toString() || 'anonymous';
    const dailySeed = this.computeDailySeed(userId);

    // Seeded sample from the valid explore pool
    const seededExplore = this.seededShuffle(validExplorePool, dailySeed);
    const finalExplore = seededExplore.slice(0, exploreCount);

    // Interleave exploit and explore items deterministically
    return this.interleave(finalExploit, finalExplore, dailySeed);
  }

  /**
   * Add a novelty bonus to items the user hasn't interacted with.
   * IMPORTANT: Modifies `rawScore` — the field used by recommendationEngine for sorting.
   */
  public applyNoveltyBonus(
    items: any[],
    userInteractedIds: Set<string>,
    bonusWeight: number = 0.15
  ): any[] {
    return items.map((item) => {
      const isNovel = !userInteractedIds.has(item._id?.toString());
      if (isNovel) {
        const currentRaw = item.rawScore || item.score || 0;
        return {
          ...item,
          rawScore: currentRaw * (1 + bonusWeight),
        };
      }
      return item;
    });
  }

  /**
   * Compute a deterministic daily seed from a user ID.
   * Same user gets the same seed for the entire day, but different seed each day.
   */
  private computeDailySeed(userId: string): number {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const seedStr = `${userId}:${today}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      const char = seedStr.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Seeded pseudo-random shuffle (Lehmer RNG + Fisher-Yates).
   * Deterministic for the same seed — eliminates flickering.
   */
  private seededShuffle(array: any[], seed: number): any[] {
    const newArr = [...array];
    let rng = seed;
    for (let i = newArr.length - 1; i > 0; i--) {
      rng = (rng * 16807 + 0) % 2147483647; // Lehmer LCG
      const j = rng % (i + 1);
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  /**
   * Interleave two arrays such that explore items are spread evenly
   * throughout the list (not clustered at the end).
   */
  private interleave(exploit: any[], explore: any[], seed: number): any[] {
    if (explore.length === 0) return exploit;
    if (exploit.length === 0) return explore;

    const result: any[] = [];
    const total = exploit.length + explore.length;
    const step = total / Math.max(explore.length, 1);

    let eIdx = 0;
    let xIdx = 0;
    let nextExploreSlot = Math.floor(step / 2); // Start inserting in the middle-ish

    for (let i = 0; i < total; i++) {
      if (i >= nextExploreSlot && xIdx < explore.length) {
        result.push(explore[xIdx++]);
        nextExploreSlot += step;
      } else if (eIdx < exploit.length) {
        result.push(exploit[eIdx++]);
      } else if (xIdx < explore.length) {
        result.push(explore[xIdx++]);
      }
    }

    return result;
  }
}

export const explorationEngine = new ExplorationEngine();
