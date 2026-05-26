import { RecommendationCache } from './recommendationCache';
import logger from '../../config/logger';

/**
 * Indian festival / event calendar for seasonal boosting.
 * Each entry defines date ranges, boosted categories/styles, and boost factor.
 */
interface SeasonalPeriod {
  name: string;
  context: string;
  startMonth: number; startDay: number;
  endMonth: number;   endDay: number;
  boostedCategories: string[];
  boostedStyles: string[];
  boostFactor: number;
}

const SEASONAL_CALENDAR: SeasonalPeriod[] = [
  {
    name: 'Diwali Season',
    context: 'diwali',
    startMonth: 10, startDay: 15,
    endMonth: 11, endDay: 15,
    boostedCategories: ['traditional', 'pooja', 'rangoli', 'lighting', 'diwali', 'festive'],
    boostedStyles: ['traditional', 'heritage', 'vibrant'],
    boostFactor: 1.5,
  },
  {
    name: 'Wedding Season',
    context: 'wedding_season',
    startMonth: 11, startDay: 15,
    endMonth: 2, endDay: 28,
    boostedCategories: ['wedding', 'mandap', 'floral', 'luxury', 'stage', 'bridal', 'engagement'],
    boostedStyles: ['luxury', 'premium', 'traditional', 'floral', 'grand'],
    boostFactor: 1.8,
  },
  {
    name: 'Christmas & New Year',
    context: 'christmas_newyear',
    startMonth: 12, startDay: 20,
    endMonth: 1, endDay: 5,
    boostedCategories: ['modern', 'party', 'celebration', 'minimalistic', 'christmas'],
    boostedStyles: ['modern', 'minimalistic', 'contemporary'],
    boostFactor: 1.3,
  },
  {
    name: 'Sankranti',
    context: 'sankranti',
    startMonth: 1, startDay: 10,
    endMonth: 1, endDay: 20,
    boostedCategories: ['traditional', 'rangoli', 'heritage', 'sankranti', 'pooja'],
    boostedStyles: ['traditional', 'heritage', 'colorful'],
    boostFactor: 1.4,
  },
  {
    name: 'Holi Season',
    context: 'holi',
    startMonth: 3, startDay: 1,
    endMonth: 3, endDay: 15,
    boostedCategories: ['colorful', 'floral', 'vibrant', 'outdoor', 'holi'],
    boostedStyles: ['vibrant', 'colorful', 'modern'],
    boostFactor: 1.2,
  },
  {
    name: 'Summer Events',
    context: 'summer',
    startMonth: 4, startDay: 1,
    endMonth: 6, endDay: 30,
    boostedCategories: ['minimalistic', 'outdoor', 'garden', 'birthday', 'summer'],
    boostedStyles: ['minimalistic', 'modern', 'outdoor'],
    boostFactor: 1.2,
  },
  {
    name: 'Monsoon & Engagement Season',
    context: 'monsoon_engagement',
    startMonth: 7, startDay: 1,
    endMonth: 9, endDay: 30,
    boostedCategories: ['engagement', 'indoor', 'premium', 'intimate'],
    boostedStyles: ['premium', 'intimate', 'indoor'],
    boostFactor: 1.3,
  },
  {
    name: 'Navratri & Dussehra',
    context: 'navratri',
    startMonth: 10, startDay: 1,
    endMonth: 10, endDay: 14,
    boostedCategories: ['traditional', 'pooja', 'navratri', 'festive', 'heritage'],
    boostedStyles: ['traditional', 'heritage', 'vibrant'],
    boostFactor: 1.3,
  },
];

export interface SeasonalContext {
  activePeriods: {
    name: string;
    context: string;
    boostedCategories: string[];
    boostedStyles: string[];
    boostFactor: number;
  }[];
  currentDate: string;
  isSeasonallyActive: boolean;
}

/**
 * Check if a given date falls within a seasonal period.
 * Handles periods that cross year boundaries (e.g., Nov 15 → Feb 28).
 */
function isDateInPeriod(date: Date, period: SeasonalPeriod): boolean {
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();
  const dateVal = month * 100 + day; // e.g., Jan 15 = 115, Dec 25 = 1225

  const startVal = period.startMonth * 100 + period.startDay;
  const endVal = period.endMonth * 100 + period.endDay;

  if (startVal <= endVal) {
    // Normal range (e.g., Mar 1 → Mar 15)
    return dateVal >= startVal && dateVal <= endVal;
  } else {
    // Wraps around year (e.g., Nov 15 → Feb 28)
    return dateVal >= startVal || dateVal <= endVal;
  }
}

/**
 * Detect current seasonal context based on today's date.
 */
export function detectSeasonalContext(date: Date = new Date()): SeasonalContext {
  const activePeriods = SEASONAL_CALENDAR
    .filter((period) => isDateInPeriod(date, period))
    .map(({ name, context, boostedCategories, boostedStyles, boostFactor }) => ({
      name,
      context,
      boostedCategories,
      boostedStyles,
      boostFactor,
    }));

  return {
    activePeriods,
    currentDate: date.toISOString().split('T')[0],
    isSeasonallyActive: activePeriods.length > 0,
  };
}

/**
 * Compute seasonal boost multiplier for an item based on its category and style.
 */
export function computeSeasonalBoost(
  category?: string,
  style?: string,
  tags?: string[],
  seasonalContext?: SeasonalContext
): number {
  const ctx = seasonalContext || detectSeasonalContext();

  if (!ctx.isSeasonallyActive) return 1.0;

  let maxBoost = 1.0;
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedStyle = (style || '').toLowerCase();
  const normalizedTags = (tags || []).map((t) => t.toLowerCase());

  for (const period of ctx.activePeriods) {
    let match = false;

    // Check category match
    if (period.boostedCategories.some((c) => normalizedCategory.includes(c) || normalizedTags.includes(c))) {
      match = true;
    }

    // Check style match
    if (period.boostedStyles.some((s) => normalizedStyle.includes(s) || normalizedTags.includes(s))) {
      match = true;
    }

    if (match && period.boostFactor > maxBoost) {
      maxBoost = period.boostFactor;
    }
  }

  return maxBoost;
}

/**
 * Get cached seasonal context, or compute and cache it.
 */
export async function getCachedSeasonalContext(): Promise<SeasonalContext> {
  const cached = await RecommendationCache.getSeasonalContext();
  if (cached) return cached;

  const context = detectSeasonalContext();
  await RecommendationCache.setSeasonalContext(context);

  if (context.isSeasonallyActive) {
    logger.info(
      `[SEASONAL ENGINE] Active seasons: ${context.activePeriods.map((p) => p.name).join(', ')}`
    );
  }

  return context;
}

/**
 * Get the primary seasonal context string for snapshot labeling.
 */
export function getPrimarySeasonalLabel(context?: SeasonalContext): string {
  const ctx = context || detectSeasonalContext();
  if (!ctx.isSeasonallyActive) return 'none';

  // Return the highest-boost period as primary
  const sorted = [...ctx.activePeriods].sort((a, b) => b.boostFactor - a.boostFactor);
  return sorted[0]?.context || 'none';
}
