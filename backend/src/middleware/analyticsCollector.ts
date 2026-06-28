import { Request, Response, NextFunction } from 'express';
import AnalyticsEvent from '../models/AnalyticsEvent';
import logger from '../config/logger';

/**
 * Extracts UTM parameters from query string
 */
const extractUTMs = (query: any) => {
  return {
    utmSource: query.utm_source,
    utmMedium: query.utm_medium,
    utmCampaign: query.utm_campaign,
    utmTerm: query.utm_term,
    utmContent: query.utm_content,
  };
};

/**
 * Classifies referral channel based on referrer string
 */
const classifyReferralChannel = (referrer: string = '') => {
  const lowerRef = referrer.toLowerCase();
  if (!lowerRef) return 'direct';
  if (lowerRef.includes('google.com')) return 'google';
  if (lowerRef.includes('instagram.com')) return 'instagram';
  if (lowerRef.includes('facebook.com') || lowerRef.includes('fb.com')) return 'facebook';
  if (lowerRef.includes('whatsapp.com')) return 'whatsapp';
  if (lowerRef.includes('mail')) return 'email';
  if (lowerRef.includes(process.env.FRONTEND_URL || 'localhost')) return 'internal'; // Self-referral
  return 'referral';
};

/**
 * Express middleware to automatically track API interactions as analytics events
 * NOTE: Primarily used for server-side events like checkout started/completed where
 * we have a defined endpoint. Most page views/clicks come from the frontend via the bulk events API.
 */
export const analyticsCollector = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // We don't block the request; fire and forget
    next();

    res.on('finish', () => {
      // Only track successful requests (e.g., checkout completed)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const utms = extractUTMs(req.query);
          const referrer = req.get('Referrer') || '';
          const channel = classifyReferralChannel(referrer);

          const reqAny = req as any;
          const event = new AnalyticsEvent({
            userId: reqAny.user?._id,
            sessionId: reqAny.headers['x-session-id'] || reqAny.sessionID || 'unknown',
            eventType,
            page: req.originalUrl.split('?')[0],
            referrer,
            metadata: {
              ...utms,
              referralChannel: channel,
              method: req.method,
              statusCode: res.statusCode,
              // Any body params can be safely extracted here if needed
            },
            device: {
              browser: req.headers['user-agent'],
            },
            location: {
              // Can extract IP based country if geoip is available
            },
          });

          event
            .save()
            .catch((err) => logger.error('Failed to save analytics event (middleware)', err));
        } catch (error) {
          logger.error('Error in analytics collector middleware', error);
        }
      }
    });
  };
};
