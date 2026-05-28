import '../config/loadEnv';
import { Worker, Job } from 'bullmq';
import { connection } from './queues';
import logger from '../config/logger';
import { sendDirectEmail } from '../services/notificationService';
import { rebuildUserProfile, rebuildStaleProfiles } from '../services/recommendation/userProfileBuilder';
import { calculateTrending, saveTrendingSnapshot } from '../services/recommendation/trendingEngine';
import { getCachedSeasonalContext, getPrimarySeasonalLabel } from '../services/recommendation/seasonalEngine';
import { requestContextStorage } from '../middleware/requestTracker';

// Declare workers as let (live bindings)
export let emailWorker: Worker | null = null;
export let notificationWorker: Worker | null = null;
export let loyaltyWorker: Worker | null = null;
export let recommendationWorker: Worker | null = null;

let workersInitialized = false;

export const initWorkers = async () => {
  if (workersInitialized) return;

  const shouldRunWorkers = process.env.ENABLE_WORKERS !== 'false';
  if (!shouldRunWorkers) {
    logger.info('ℹ️ [WORKER] Background workers are disabled via ENABLE_WORKERS=false');
    workersInitialized = true;
    return;
  }

  try {
    logger.info('🔄 [WORKER] Initializing background workers...');

    // Email Worker
    emailWorker = new Worker(
      'emailQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run({ requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId }, async () => {
          logger.info(`[WORKER] Processing email job ${job.id} for ${job.data.to}`);
          await sendDirectEmail({
            email: job.data.to,
            subject: job.data.subject,
            customHtml: job.data.html,
            type: 'system',
            action: 'background_email'
          });
        });
      },
      { connection }
    );

    emailWorker.on('completed', (job) => logger.info(`[WORKER] Email job ${job.id} completed.`));
    emailWorker.on('failed', (job, err) => logger.error(`[WORKER] Email job ${job?.id} failed:`, err));
    emailWorker.on('error', (err: any) => {
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
      logger.error(`[WORKER email] Error:`, err);
    });

    // Notification Worker (placeholder for push/SMS)
    notificationWorker = new Worker(
      'notificationQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run({ requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId }, async () => {
          logger.info(`[WORKER] Processing notification job ${job.id}`);
          // Future integration
        });
      },
      { connection }
    );

    notificationWorker.on('error', (err: any) => {
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
      logger.error(`[WORKER notification] Error:`, err);
    });

    // Loyalty Worker (placeholder for loyalty points assignment)
    loyaltyWorker = new Worker(
      'loyaltyQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run({ requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId }, async () => {
          logger.info(`[WORKER] Processing loyalty job ${job.id} for user ${job.data.userId}`);
          // Future integration
        });
      },
      { connection }
    );

    loyaltyWorker.on('error', (err: any) => {
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
      logger.error(`[WORKER loyalty] Error:`, err);
    });

    // Recommendation Worker
    recommendationWorker = new Worker(
      'recommendationQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run({ requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId }, async () => {
          const { type } = job.data;
          logger.info(`[WORKER] Processing recommendation job ${job.id} (type: ${type})`);

          switch (type) {
            case 'rebuild-user-profile': {
              const { userId } = job.data;
              await rebuildUserProfile(userId);
              break;
            }
            case 'rebuild-stale-profiles': {
              const count = await rebuildStaleProfiles();
              logger.info(`[WORKER] Rebuilt ${count} stale user profiles`);
              break;
            }
            case 'rebuild-user-feed': {
              const { userId, page } = job.data;
              const { getPersonalizedRecommendations } = require('../services/recommendation/recommendationEngine');
              const { RecommendationCache } = require('../services/recommendation/recommendationCache');
              
              if (userId) {
                const result = await getPersonalizedRecommendations({ userId, page, limit: 12, offset: 0 });
                await RecommendationCache.setPersonalFeed(userId, page, result);
                logger.info(`[WORKER] Rebuilt personalized feed for user ${userId} page ${page}`);
              }
              break;
            }
            case 'precompute-similar': {
              const { targetType, targetId } = job.data;
              const { RecommendationCache } = require('../services/recommendation/recommendationCache');
              const Product = require('../models/Product').default;
              
              if (targetType === 'product') {
                await require('../services/recommendation/similarityEngine').findSimilarProducts(targetId, { limit: 12 });
                
                const product = await Product.findById(targetId).select('category').lean();
                if (product) {
                  const compItems = await require('../services/recommendation/similarityEngine').getComplementaryItems(product.category || '', [targetId], { limit: 8 });
                  const productIds = compItems.map((i: any) => i.targetId);
                  const fullProducts = await Product.find({ _id: { $in: productIds }, isActive: true })
                    .select('_id title imageSrc category price rating reviews slug')
                    .lean();

                  const enrichedComp = compItems.map((item: any) => {
                    const full = fullProducts.find((prod: any) => (prod._id as any).toString() === item.targetId);
                    return full ? {
                      _id: item.targetId,
                      targetType: 'product',
                      score: item.similarityScore,
                      source: 'complete-setup',
                      title: full.title,
                      imageSrc: full.imageSrc,
                      category: full.category,
                      price: full.price,
                      rating: full.rating,
                      reviews: full.reviews,
                      slug: full.slug,
                    } : null;
                  }).filter(Boolean);
                  await RecommendationCache.setCompleteSetup(targetId, enrichedComp);
                }

                const alsoViewed = await require('../services/recommendation/similarityEngine').getUsersAlsoViewed(targetId, 'product', { limit: 12 });
                const { enrichScoredItems: enrichHelper } = require('../services/recommendation/recommendationEngine');
                const enrichedAlsoViewed = await enrichHelper(
                  alsoViewed.map((i: any) => ({ targetId: i.targetId, targetType: i.targetType, score: i.similarityScore }))
                );
                await RecommendationCache.setAlsoViewed(targetId, enrichedAlsoViewed);

              } else if (targetType === 'event') {
                await require('../services/recommendation/similarityEngine').findSimilarEvents(targetId, { limit: 8 });
                
                const alsoViewed = await require('../services/recommendation/similarityEngine').getUsersAlsoViewed(targetId, 'event', { limit: 8 });
                const { enrichScoredItems: enrichHelper } = require('../services/recommendation/recommendationEngine');
                const enrichedAlsoViewed = await enrichHelper(
                  alsoViewed.map((i: any) => ({ targetId: i.targetId, targetType: i.targetType, score: i.similarityScore }))
                );
                await RecommendationCache.setAlsoViewed(targetId, enrichedAlsoViewed);
              }
              logger.info(`[WORKER] Precomputed similarities and fallbacks for ${targetType} ${targetId}`);
              break;
            }
            case 'precompute-catalog-recommendations': {
              const { precomputeCatalogRecommendations } = require('../services/recommendation/recommendationEngine');
              await precomputeCatalogRecommendations();
              break;
            }
            case 'precompute-active-users-feeds': {
              const { precomputeActiveUsersFeeds } = require('../services/recommendation/recommendationEngine');
              await precomputeActiveUsersFeeds();
              break;
            }
            case 'update-trending': {
              for (const targetType of ['product', 'event', 'gallery']) {
                await calculateTrending(targetType, { limit: 20 });
              }
              logger.info('[WORKER] Trending rankings updated');
              break;
            }
            case 'update-seasonal-context': {
              await getCachedSeasonalContext();
              logger.info('[WORKER] Seasonal context refreshed');
              break;
            }
            case 'snapshot-trending': {
              const seasonalCtx = await getCachedSeasonalContext();
              const label = getPrimarySeasonalLabel(seasonalCtx);
              for (const targetType of ['product', 'event', 'gallery']) {
                await saveTrendingSnapshot('hourly', targetType, label);
              }
              logger.info('[WORKER] Trending snapshots saved');
              break;
            }
            default:
              logger.warn(`[WORKER] Unknown recommendation job type: ${type}`);
          }
        });
      },
      { connection }
    );

    recommendationWorker.on('completed', (job) =>
      logger.info(`[WORKER] Recommendation job ${job.id} completed.`)
    );
    recommendationWorker.on('failed', (job, err) =>
      logger.error(`[WORKER] Recommendation job ${job?.id} failed:`, err)
    );
    recommendationWorker.on('error', (err: any) => {
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') return;
      logger.error(`[WORKER recommendation] Error:`, err);
    });

    workersInitialized = true;
    logger.info('🟢 [WORKER] Background workers initialized successfully');
  } catch (err: any) {
    logger.error(`🔴 [WORKER] Failed to initialize workers: ${err.message}`);
    // Workers failure shouldn't crash the server unless REQUIRE_REDIS is true
    if (process.env.REQUIRE_REDIS === 'true') {
      throw err;
    }
  }
};

export const closeWorkers = async () => {
  if (workersInitialized) {
    if (emailWorker) await emailWorker.close();
    if (notificationWorker) await notificationWorker.close();
    if (loyaltyWorker) await loyaltyWorker.close();
    if (recommendationWorker) await recommendationWorker.close();
  }
};
