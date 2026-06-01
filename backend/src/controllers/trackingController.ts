import { Request, Response } from 'express';
import UserInteraction from '../models/UserInteraction';
import { RecommendationCache } from '../services/recommendation/recommendationCache';
import { recommendationQueue, isQueuesReady } from '../jobs/queues';
import logger from '../config/logger';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { getTrackingCookieOptions } from '../config/cookieConfig';
import { sanitizeTrackingMetadata } from '../utils/aiSanitizer';

const VALID_EVENT_TYPES = new Set([
  'product_view',
  'product_click',
  'gallery_view',
  'gallery_click',
  'event_view',
  'event_click',
  'showcase_view',
  'wishlist_add',
  'wishlist_remove',
  'cart_add',
  'cart_remove',
  'purchase',
  'booking',
  'search',
  'category_explore',
  'review_read',
  'review_submit',
]);

const VALID_TARGET_TYPES = new Set(['product', 'event', 'gallery', 'showcase']);

const isValidInteractionPayload = (
  eventType: string,
  targetType: string,
  targetId: string,
): boolean =>
  VALID_EVENT_TYPES.has(eventType) &&
  VALID_TARGET_TYPES.has(targetType) &&
  mongoose.Types.ObjectId.isValid(targetId);

/**
 * POST /tracking/event — Log a single behavioral event.
 */
export const trackEvent = async (req: Request, res: Response) => {
  try {
    const { eventType, targetType, targetId, metadata } = req.body;

    if (!eventType || !targetType || !targetId) {
      return res
        .status(400)
        .json({ success: false, message: 'eventType, targetType, and targetId are required' });
    }

    const userId = (req as any).user?.id || (req as any).user?._id || null;
    const sessionId = req.cookies?.reco_session || req.body.sessionId || crypto.randomUUID();

    // Set session cookie if not present
    if (!req.cookies?.reco_session) {
      res.cookie('reco_session', sessionId, getTrackingCookieOptions());
    }

    if (!isValidInteractionPayload(eventType, targetType, targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid tracking event payload' });
    }

    // Sanitize metadata to prevent stored XSS and invalid data
    const sanitizedMetadata = sanitizeTrackingMetadata(metadata);

    // Fire-and-forget insert for performance
    UserInteraction.create({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      sessionId,
      eventType,
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
      metadata: sanitizedMetadata,
      timestamp: new Date(),
    }).catch((err) => {
      logger.error(`[TRACKING] Failed to store interaction: ${err.message}`);
    });

    // Update session context for real-time adaptation (fire-and-forget)
    RecommendationCache.updateSessionContext(sessionId, {
      category: metadata?.category,
      style: metadata?.style,
      targetId,
      eventType,
    }).catch(() => {});

    // If significant activity, enqueue profile rebuild
    if (userId && ['purchase', 'booking', 'wishlist_add', 'cart_add'].includes(eventType)) {
      if (isQueuesReady()) {
        recommendationQueue
          .add(
            'rebuild-user-profile',
            { type: 'rebuild-user-profile', userId },
            { priority: 2, delay: 5000 }, // Slight delay to batch rapid events
          )
          .catch(() => {});
      }

      // Invalidate personal feed cache
      RecommendationCache.clearPersonalFeed(userId).catch(() => {});
    }

    return res.status(200).json({ success: true, sessionId });
  } catch (err: any) {
    logger.error(`[TRACKING] Error in trackEvent: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Tracking failed' });
  }
};

/**
 * POST /tracking/batch — Log a batch of events (scroll depth, dwell time, etc.)
 */
export const trackBatchEvents = async (req: Request, res: Response) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'events array is required' });
    }

    // Cap batch size for abuse prevention
    const cappedEvents = events.slice(0, 20);

    const userId = (req as any).user?.id || (req as any).user?._id || null;
    const sessionId = req.cookies?.reco_session || req.body.sessionId || crypto.randomUUID();

    // Deduplicate within batch: same (eventType+targetId+targetType) = keep first
    const seenKeys = new Set<string>();
    const dedupedEvents = cappedEvents.filter((e: any) => {
      if (!e.eventType || !e.targetType || !e.targetId) return false;
      const key = `${e.eventType}:${e.targetType}:${e.targetId}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    const docs = dedupedEvents
      .filter(
        (e: any) =>
          e.eventType &&
          e.targetType &&
          e.targetId &&
          isValidInteractionPayload(e.eventType, e.targetType, e.targetId),
      )
      .map((e: any) => {
        const sanitizedMeta = sanitizeTrackingMetadata(e.metadata);
        return {
          userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          sessionId,
          eventType: e.eventType,
          targetType: e.targetType,
          targetId: new mongoose.Types.ObjectId(e.targetId),
          metadata: sanitizedMeta,
          timestamp: new Date(),
        };
      });

    if (docs.length > 0) {
      UserInteraction.insertMany(docs, { ordered: false }).catch((err) => {
        logger.error(`[TRACKING] Batch insert failed: ${err.message}`);
      });
    }

    return res.status(200).json({ success: true, tracked: docs.length, sessionId });
  } catch (err: any) {
    logger.error(`[TRACKING] Error in trackBatchEvents: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Batch tracking failed' });
  }
};

/**
 * POST /tracking/session — Initialize an anonymous session (returns session ID).
 */
export const initSession = async (req: Request, res: Response) => {
  try {
    const existingSessionId = req.cookies?.reco_session;

    if (existingSessionId) {
      return res.status(200).json({ success: true, sessionId: existingSessionId });
    }

    const sessionId = crypto.randomUUID();

    res.cookie('reco_session', sessionId, getTrackingCookieOptions());

    return res.status(200).json({ success: true, sessionId });
  } catch (err: any) {
    logger.error(`[TRACKING] Error in initSession: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Session init failed' });
  }
};
