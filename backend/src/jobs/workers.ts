import '../config/loadEnv';
import { Worker, Job } from 'bullmq';
import { connection, usingFallback } from './queues';
import logger from '../config/logger';
import { sendDirectEmailProcessor } from '../services/notificationService';
import {
  rebuildUserProfile,
  rebuildStaleProfiles,
} from '../services/recommendation/userProfileBuilder';
import { calculateTrending, saveTrendingSnapshot } from '../services/recommendation/trendingEngine';
import {
  getCachedSeasonalContext,
  getPrimarySeasonalLabel,
} from '../services/recommendation/seasonalEngine';
import { requestContextStorage } from '../middleware/requestTracker';

// Declare workers as let (live bindings)
export let emailWorker: Worker | null = null;
export let notificationWorker: Worker | null = null;
export let loyaltyWorker: Worker | null = null;
export let recommendationWorker: Worker | null = null;
export let webhookWorker: Worker | null = null;
export let refundWorker: Worker | null = null;
export let systemWorker: Worker | null = null;

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

    if (usingFallback) {
      logger.info(
        'ℹ️ [WORKER] Using in-memory fallback queues, skipping BullMQ worker initialization.',
      );
      workersInitialized = true;
      return;
    }

    // Email Worker
    emailWorker = new Worker(
      'emailQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
            logger.info(`[WORKER] Processing email job`, {
              jobId: job.id,
              email: job.data.email || job.data.to,
            });

            // Support both legacy {to, subject, html} and new full EmailOptions formats
            const emailOptions = job.data.email
              ? job.data
              : {
                  email: job.data.to,
                  subject: job.data.subject,
                  customHtml: job.data.html,
                  template: job.data.template,
                  context: job.data.context,
                  generatePdf: job.data.generatePdf,
                  type: job.data.type || 'system',
                  action: job.data.action || 'background_email',
                  attachments: job.data.attachments,
                };

            await sendDirectEmailProcessor(emailOptions);
          },
        );
      },
      { connection: connection as any, concurrency: 5 },
    );

    emailWorker.on('completed', (job) =>
      logger.info(`[WORKER] Email job completed`, { jobId: job.id }),
    );
    emailWorker.on('failed', (job, err) =>
      logger.error(`[WORKER] Email job failed`, {
        jobId: job?.id,
        error: err.message,
        stack: err.stack,
      }),
    );
    emailWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER email] Error:`, err);
    });

    // Notification Worker (placeholder for push/SMS)
    notificationWorker = new Worker(
      'notificationQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
            logger.info(`[WORKER] Processing notification job ${job.id}`);
            const { createAdminNotification } = require('../services/notificationService');
            await createAdminNotification(job.data);
          },
        );
      },
      { connection: connection as any, concurrency: 5 },
    );

    notificationWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER notification] Error:`, err);
    });

    // Loyalty Worker (placeholder for loyalty points assignment)
    loyaltyWorker = new Worker(
      'loyaltyQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
            logger.info(`[WORKER] Processing loyalty job ${job.id} for user ${job.data.userId}`);
            // Future integration
          },
        );
      },
      { connection: connection as any, concurrency: 2 },
    );

    loyaltyWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER loyalty] Error:`, err);
    });

    // Recommendation Worker
    recommendationWorker = new Worker(
      'recommendationQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
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
                const {
                  getPersonalizedRecommendations,
                } = require('../services/recommendation/recommendationEngine');
                const {
                  RecommendationCache,
                } = require('../services/recommendation/recommendationCache');

                if (userId) {
                  const result = await getPersonalizedRecommendations({
                    userId,
                    page,
                    limit: 12,
                    offset: 0,
                  });
                  await RecommendationCache.setPersonalFeed(userId, page, result);
                  logger.info(`[WORKER] Rebuilt personalized feed for user ${userId} page ${page}`);
                }
                break;
              }
              case 'precompute-similar': {
                const { targetType, targetId } = job.data;
                const {
                  RecommendationCache,
                } = require('../services/recommendation/recommendationCache');
                const Product = require('../models/Product').default;

                if (targetType === 'product') {
                  await require('../services/recommendation/similarityEngine').findSimilarProducts(
                    targetId,
                    { limit: 12 },
                  );

                  const product = await Product.findById(targetId).select('category').lean();
                  if (product) {
                    const compItems =
                      await require('../services/recommendation/similarityEngine').getComplementaryItems(
                        product.category || '',
                        [targetId],
                        { limit: 8 },
                      );
                    const productIds = compItems.map((i: any) => i.targetId);
                    const fullProducts = await Product.find({
                      _id: { $in: productIds },
                      isActive: true,
                    })
                      .select('_id title imageSrc category price rating reviews slug')
                      .lean();

                    const enrichedComp = compItems
                      .map((item: any) => {
                        const full = fullProducts.find(
                          (prod: any) => (prod._id as any).toString() === item.targetId,
                        );
                        return full
                          ? {
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
                            }
                          : null;
                      })
                      .filter(Boolean);
                    await RecommendationCache.setCompleteSetup(targetId, enrichedComp);
                  }

                  const alsoViewed =
                    await require('../services/recommendation/similarityEngine').getUsersAlsoViewed(
                      targetId,
                      'product',
                      { limit: 12 },
                    );
                  const {
                    enrichScoredItems: enrichHelper,
                  } = require('../services/recommendation/recommendationEngine');
                  const enrichedAlsoViewed = await enrichHelper(
                    alsoViewed.map((i: any) => ({
                      targetId: i.targetId,
                      targetType: i.targetType,
                      score: i.similarityScore,
                    })),
                  );
                  await RecommendationCache.setAlsoViewed(targetId, enrichedAlsoViewed);
                } else if (targetType === 'event') {
                  await require('../services/recommendation/similarityEngine').findSimilarEvents(
                    targetId,
                    { limit: 8 },
                  );

                  const alsoViewed =
                    await require('../services/recommendation/similarityEngine').getUsersAlsoViewed(
                      targetId,
                      'event',
                      { limit: 8 },
                    );
                  const {
                    enrichScoredItems: enrichHelper,
                  } = require('../services/recommendation/recommendationEngine');
                  const enrichedAlsoViewed = await enrichHelper(
                    alsoViewed.map((i: any) => ({
                      targetId: i.targetId,
                      targetType: i.targetType,
                      score: i.similarityScore,
                    })),
                  );
                  await RecommendationCache.setAlsoViewed(targetId, enrichedAlsoViewed);
                }
                logger.info(
                  `[WORKER] Precomputed similarities and fallbacks for ${targetType} ${targetId}`,
                );
                break;
              }
              case 'precompute-catalog-recommendations': {
                const {
                  precomputeCatalogRecommendations,
                } = require('../services/recommendation/recommendationEngine');
                await precomputeCatalogRecommendations();
                break;
              }
              case 'precompute-active-users-feeds': {
                const {
                  precomputeActiveUsersFeeds,
                } = require('../services/recommendation/recommendationEngine');
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
          },
        );
      },
      { connection: connection as any, concurrency: 2 },
    );

    recommendationWorker.on('completed', (job) =>
      logger.info(`[WORKER] Recommendation job ${job.id} completed.`),
    );
    recommendationWorker.on('failed', (job, err) =>
      logger.error(`[WORKER] Recommendation job ${job?.id} failed:`, err),
    );
    recommendationWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER recommendation] Error:`, err);
    });

    // Webhook Worker
    webhookWorker = new Worker(
      'webhookQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
            logger.info(`[WORKER] Processing webhook job`, {
              jobId: job.id,
              event: job.data.event,
              razorpayEventId: job.data.eventId,
            });
            const { UnifiedWebhookRouter } = require('../services/payments/UnifiedWebhookRouter');
            await UnifiedWebhookRouter.routeWebhookEvent(
              job.data.event,
              job.data.body,
              job.data.signature,
              job.data.eventId,
            );
          },
        );
      },
      { connection: connection as any, concurrency: 5 },
    );

    webhookWorker.on('completed', (job) =>
      logger.info(`[WORKER] Webhook job completed`, { jobId: job.id }),
    );
    webhookWorker.on('failed', async (job, err) => {
      logger.error(`[WORKER] Webhook job failed`, {
        jobId: job?.id,
        razorpayEventId: job?.data?.eventId,
        error: err.message,
        stack: err.stack,
      });
      if (job?.data?.eventId) {
        try {
          const PaymentWebhookEvent = require('../models/PaymentWebhookEvent').default;
          await PaymentWebhookEvent.updateOne(
            { razorpayEventId: job.data.eventId },
            { $set: { status: 'failed', errorLog: err.message, updatedAt: new Date() } },
          );
        } catch (dbErr) {
          logger.error(
            `[WORKER] Failed to mark webhook ${job.data.eventId} as dead_letter:`,
            dbErr,
          );
        }
      }
    });
    webhookWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER webhook] Error:`, err);
    });

    // Refund Worker
    refundWorker = new Worker(
      'refundQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
            logger.info(
              `[WORKER] Processing refund job ${job.id} for RefundRecord ${job.data.refundRecordId}`,
            );
            const { PaymentRefundService } = require('../services/PaymentRefundService');
            await PaymentRefundService.processRefundAsyncCore(job.data.refundRecordId);
          },
        );
      },
      { connection: connection as any, concurrency: 2 },
    );

    refundWorker.on('completed', (job) => logger.info(`[WORKER] Refund job ${job.id} completed.`));
    refundWorker.on('failed', async (job, err) => {
      logger.error(`[WORKER] Refund job ${job?.id} failed:`, err);
    });
    refundWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER refund] Error:`, err);
    });

    // System Worker (for distributed cron replacements like outbox processor)
    systemWorker = new Worker(
      'systemQueue',
      async (job: Job) => {
        const trace = job.data._trace || {};
        return requestContextStorage.run(
          { requestId: trace.requestId || `bullmq-${job.id}`, userId: trace.userId },
          async () => {
            if (job.name === 'process-outbox') {
              const { processOutboxEvents } = require('./outboxProcessor');
              await processOutboxEvents();
            }
          },
        );
      },
      { connection: connection as any, concurrency: 1 },
    );
    systemWorker.on('error', (err: any) => {
      if (
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.name === 'ConnectionClosedError' ||
        err.message?.includes('max requests limit exceeded') ||
        err.message?.includes('Connection is closed')
      )
        return;
      logger.error(`[WORKER system] Error:`, err);
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
    logger.info('🛑 [WORKER] Shutting down workers gracefully...');
    const closePromises = [
      emailWorker?.close(),
      notificationWorker?.close(),
      loyaltyWorker?.close(),
      recommendationWorker?.close(),
      webhookWorker?.close(),
      refundWorker?.close(),
      systemWorker?.close(),
    ].filter(Boolean);

    await Promise.allSettled(closePromises);
    logger.info('✅ [WORKER] All workers closed.');
  }
};
