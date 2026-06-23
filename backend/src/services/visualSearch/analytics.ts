import VisualSearchLog from '../../models/VisualSearchLog';

export async function getVisualSearchAnalytics(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalSearches,
    successfulSearches,
    averageConfidence,
    topCategories,
    dailyUsage,
    interactionBreakdown,
    averageDuration,
    providerUsage,
  ] = await Promise.all([
    VisualSearchLog.countDocuments({ createdAt: { $gte: since } }),
    VisualSearchLog.countDocuments({
      createdAt: { $gte: since },
      resultCount: { $gt: 0 },
    }),
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$aiConfidence' } } },
    ]),
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since }, aiCategory: { $ne: '' } } },
      { $group: { _id: '$aiCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$userInteraction', count: { $sum: 1 } } },
    ]),
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: '$searchDurationMs' } } },
    ]),
    VisualSearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } },
    ]),
  ]);

  const failedSearches = totalSearches - successfulSearches;

  return {
    totalSearches,
    successfulSearches,
    failedSearches,
    successRate: totalSearches > 0 ? Math.round((successfulSearches / totalSearches) * 100) : 0,
    averageConfidence: averageConfidence[0]?.avg ? Math.round(averageConfidence[0].avg * 100) : 0,
    averageDurationMs: averageDuration[0]?.avg ? Math.round(averageDuration[0].avg) : 0,
    topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
    dailyUsage: dailyUsage.map((d) => ({ date: d._id, count: d.count })),
    interactionBreakdown: interactionBreakdown.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    providerUsage: providerUsage.map((p) => ({ provider: p._id, count: p.count })),
    periodDays: days,
  };
}
