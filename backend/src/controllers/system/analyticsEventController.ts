import { Request, Response } from 'express';
import AnalyticsEvent from '../../models/AnalyticsEvent';
import logger from '../../config/logger';
import { SearchIntelligenceService } from '../../services/analytics/SearchIntelligenceService';

// Server-side memory queue for batching inserts
let eventBuffer: any[] = [];
const BUFFER_LIMIT = 500;
let flushTimer: NodeJS.Timeout | null = null;

const flushBuffer = async () => {
  if (eventBuffer.length === 0) return;

  const eventsToInsert = [...eventBuffer];
  eventBuffer = []; // Clear immediately to avoid duplicates if more arrive during flush

  try {
    await AnalyticsEvent.insertMany(eventsToInsert, { ordered: false });
    logger.debug(`[Analytics] Flushed ${eventsToInsert.length} events to database`);
  } catch (error) {
    logger.error('[Analytics] Failed to bulk insert events, putting back in queue', error);
    // Put back up to a limit to prevent memory leak
    if (eventBuffer.length < 5000) {
      eventBuffer.push(...eventsToInsert);
    }
  }
};

export const collectBulkEvents = async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid events array' });
    }

    const userId = (req as any).user?._id; // Will be undefined if anonymous, which is fine

    const formattedEvents = events.map((event: any) => {
      // If it's a search event, classify its intent before inserting
      if (event.eventType === 'search_bar_use' && event.metadata?.searchQuery) {
        event.metadata.searchIntent = SearchIntelligenceService.classifySearchIntent(
          event.metadata.searchQuery,
        );
      }

      return {
        ...event,
        userId: userId || event.userId, // Authenticated user takes precedence over client-provided ID
        timestamp: event.timestamp || new Date(),
      };
    });

    // Push to memory buffer instead of direct DB insert
    eventBuffer.push(...formattedEvents);

    if (eventBuffer.length >= BUFFER_LIMIT) {
      flushBuffer(); // Immediate flush if limit reached
    } else if (!flushTimer) {
      // Schedule flush if not already scheduled
      flushTimer = setTimeout(() => {
        flushBuffer();
        flushTimer = null;
      }, 5000); // 5 seconds
    }

    res.status(202).json({ success: true, message: 'Events collected' });
  } catch (error) {
    logger.error('Error collecting bulk analytics events', error);
    // Don't leak errors to client for background analytics collection
    res.status(202).json({ success: false, message: 'Collection failed, but accepted' });
  }
};
