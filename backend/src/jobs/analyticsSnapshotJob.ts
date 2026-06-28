import AnalyticsEvent from '../models/AnalyticsEvent';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot';
import { AIInsightsEngine } from '../services/analytics/AIInsightsEngine';
import { emitAdminNotification } from '../socket';
import logger from '../config/logger';

export async function generateDailyAnalyticsSnapshot() {
  logger.info('Starting daily analytics snapshot generation...');

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1); // Start of yesterday

  try {
    // 1. Gather metrics for yesterday
    const match = { timestamp: { $gte: yesterday, $lt: today } };

    // Total unique users (approximation for active customers)
    const activeCustomers = (await AnalyticsEvent.distinct('userId', match)).length;

    // Top searches
    const topSearches = await AnalyticsEvent.aggregate([
      { $match: { ...match, eventType: 'search_bar_use' } },
      {
        $group: {
          _id: { query: { $toLower: '$metadata.searchQuery' }, intent: '$metadata.searchIntent' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id.query', intent: '$_id.intent', count: 1, _id: 0 } },
    ]);

    const zeroResultSearches = await AnalyticsEvent.aggregate([
      { $match: { ...match, eventType: 'search_bar_use', 'metadata.resultCount': 0 } },
      { $group: { _id: { $toLower: '$metadata.searchQuery' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, _id: 0 } },
    ]);

    // Traffic Sources
    const trafficSources = await AnalyticsEvent.aggregate([
      { $match: { ...match, 'metadata.referralChannel': { $exists: true } } },
      { $group: { _id: '$metadata.referralChannel', visitors: { $addToSet: '$sessionId' } } },
      {
        $project: {
          channel: '$_id',
          visitors: { $size: '$visitors' },
          conversions: { $literal: 0 },
          revenue: { $literal: 0 },
          _id: 0,
        },
      }, // Simplification for now
    ]);

    // Cart Abandonment Rate (started vs completed)
    const checkoutStarted = (
      await AnalyticsEvent.distinct('sessionId', { ...match, eventType: 'checkout_started' })
    ).length;
    const checkoutCompleted = (
      await AnalyticsEvent.distinct('sessionId', { ...match, eventType: 'checkout_completed' })
    ).length;
    const cartAbandonmentRate =
      checkoutStarted > 0 ? ((checkoutStarted - checkoutCompleted) / checkoutStarted) * 100 : 0;

    // Build Snapshot
    const snapshotData = {
      snapshotDate: yesterday,
      type: 'daily',
      metrics: {
        activeCustomers,
        cartAbandonmentRate,
        checkoutCompletionRate:
          checkoutStarted > 0 ? (checkoutCompleted / checkoutStarted) * 100 : 0,
        topSearches,
        zeroResultSearches,
        trafficSources,
        // (Add other metrics as needed based on models)
      },
    };

    // 2. Fetch previous snapshot for AI insights
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
    const previousSnapshot = await AnalyticsSnapshot.findOne({
      snapshotDate: dayBeforeYesterday,
      type: 'daily',
    }).lean();

    // 3. Generate AI Insights
    let aiInsights: any[] = [];
    if (previousSnapshot) {
      aiInsights = await AIInsightsEngine.generateInsights(snapshotData, previousSnapshot);
    }

    // Add insights to snapshot
    (snapshotData.metrics as any).aiInsights = aiInsights;

    // 4. Save Snapshot
    await AnalyticsSnapshot.findOneAndUpdate(
      { snapshotDate: yesterday, type: 'daily' },
      { $set: snapshotData },
      { upsert: true, new: true },
    );

    // 5. Trigger Admin Alerts (Feature #8 & others)
    // Create NotificationLog entries and emit to active admins for high severity insights
    for (const insight of aiInsights) {
      if (insight.severity === 'warning' || insight.severity === 'negative') {
        logger.warn(`Admin Alert: ${insight.message}`);

        const payload = {
          title: 'Intelligence Alert',
          message: insight.message,
          type: 'system',
          metadata: {
            source: 'ai_insight',
            severity: insight.severity,
          },
        };

        // Emit real-time to active admin dashboards
        emitAdminNotification(payload);
      }
    }

    logger.info('Daily analytics snapshot generated successfully.');
  } catch (error) {
    logger.error('Error generating daily analytics snapshot:', error);
  }
}
