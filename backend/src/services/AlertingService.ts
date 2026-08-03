import logger from '../config/logger';
import * as Sentry from '@sentry/node';
import { getAdminEmails } from '../config/adminConfig';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertChannel = 'email' | 'sentry' | 'webhook' | 'log';

export let sendDirectEmailHandler: (options: any) => void | Promise<any> = () => {};
export let createAdminNotificationHandler: (options: any) => Promise<any> = async () => {};

export const setAlertingNotificationHandlers = (
  emailHandler: typeof sendDirectEmailHandler,
  adminHandler: typeof createAdminNotificationHandler,
) => {
  sendDirectEmailHandler = emailHandler;
  createAdminNotificationHandler = adminHandler;
};

export interface AlertPayload {
  title: string;
  message: string;
  severity: AlertSeverity;
  category: 'payment' | 'inventory' | 'queue' | 'database' | 'security' | 'system' | 'backup';
  channels?: AlertChannel[];
  metadata?: Record<string, any>;
}

/**
 * AlertingService — Centralized critical event notification system.
 *
 * Dispatches alerts through multiple channels:
 * - Email: Admin email notifications for critical/high severity
 * - Sentry: Error tracking for all severities
 * - Webhook: External webhook (Slack, Discord, PagerDuty) via ALERT_WEBHOOK_URL
 * - Log: Always logs regardless of channel configuration
 *
 * Usage:
 *   await AlertingService.fire({
 *     title: 'Payment Failure',
 *     message: 'Razorpay returned 502 for order xyz',
 *     severity: 'critical',
 *     category: 'payment',
 *   });
 */
export class AlertingService {
  private static readonly DEFAULT_CHANNELS: Record<AlertSeverity, AlertChannel[]> = {
    critical: ['email', 'sentry', 'webhook', 'log'],
    high: ['email', 'sentry', 'log'],
    medium: ['sentry', 'log'],
    low: ['log'],
  };

  // Rate limiting: prevent alert storms (max 10 alerts per category per 5 minutes)
  private static alertCounts = new Map<string, { count: number; resetAt: number }>();
  private static readonly RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
  private static readonly RATE_LIMIT_MAX = 10;

  // Deduplication: suppress identical alerts within the dedup window
  private static recentAlertFingerprints = new Map<string, number>();
  private static readonly DEDUP_WINDOW_MS = 5 * 60 * 1000;

  static async fire(payload: AlertPayload): Promise<void> {
    const { title, message, severity, category, metadata } = payload;
    const channels = payload.channels || this.DEFAULT_CHANNELS[severity];

    // Rate limiting check
    const rateLimitKey = `${category}:${severity}`;
    const now = Date.now();
    const bucket = this.alertCounts.get(rateLimitKey);

    if (bucket) {
      if (now < bucket.resetAt) {
        if (bucket.count >= this.RATE_LIMIT_MAX) {
          logger.warn(
            `[ALERTING] Rate limit exceeded for ${rateLimitKey}. Suppressing alert: ${title}`,
          );
          return;
        }
        bucket.count++;
      } else {
        this.alertCounts.set(rateLimitKey, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
      }
    } else {
      this.alertCounts.set(rateLimitKey, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
    }

    // Deduplication: suppress identical alerts within the window
    const fingerprint = `${category}:${title}`;
    const lastSent = this.recentAlertFingerprints.get(fingerprint);
    if (lastSent && now - lastSent < this.DEDUP_WINDOW_MS) {
      logger.debug(`[ALERTING] Suppressing duplicate alert: ${title}`);
      return;
    }
    this.recentAlertFingerprints.set(fingerprint, now);

    // Periodic cleanup of old fingerprints to prevent memory leak
    if (this.recentAlertFingerprints.size > 200) {
      const cutoff = now - this.DEDUP_WINDOW_MS;
      for (const [key, ts] of this.recentAlertFingerprints) {
        if (ts < cutoff) this.recentAlertFingerprints.delete(key);
      }
    }

    // Always log
    const logPrefix = `[ALERT][${severity.toUpperCase()}][${category}]`;
    if (severity === 'critical' || severity === 'high') {
      logger.error(`${logPrefix} ${title}: ${message}`, metadata);
    } else {
      logger.warn(`${logPrefix} ${title}: ${message}`, metadata);
    }

    // Dispatch to configured channels (fire-and-forget, don't let channel failures block)
    const dispatches: Promise<void>[] = [];

    if (channels.includes('sentry')) {
      dispatches.push(this.sendToSentry(payload));
    }

    if (channels.includes('email')) {
      dispatches.push(this.sendToEmail(payload));
    }

    if (channels.includes('webhook')) {
      dispatches.push(this.sendToWebhook(payload));
    }

    // Admin notification (in-app)
    if (severity === 'critical' || severity === 'high') {
      dispatches.push(this.sendAdminNotification(payload));
    }

    await Promise.allSettled(dispatches);
  }

  // ── Channel Implementations ──

  private static async sendToSentry(payload: AlertPayload): Promise<void> {
    try {
      if (!process.env.SENTRY_DSN) return;

      const sentryLevel =
        payload.severity === 'critical'
          ? 'fatal'
          : payload.severity === 'high'
            ? 'error'
            : payload.severity === 'medium'
              ? 'warning'
              : 'info';

      Sentry.captureMessage(
        `[${payload.category.toUpperCase()}] ${payload.title}: ${payload.message}`,
        {
          level: sentryLevel as any,
          tags: {
            alert_category: payload.category,
            alert_severity: payload.severity,
          },
          extra: payload.metadata,
        },
      );
    } catch (err: any) {
      logger.error(`[ALERTING] Sentry dispatch failed: ${err.message}`);
    }
  }

  private static async sendToEmail(payload: AlertPayload): Promise<void> {
    try {
      const recipients = getAdminEmails();
      if (recipients.length === 0) return;

      const severityEmoji =
        payload.severity === 'critical' ? '🚨' : payload.severity === 'high' ? '⚠️' : 'ℹ️';

      const metadataHtml = payload.metadata
        ? `<h4>Details:</h4><pre style="background:#f5f5f5;padding:10px;border-radius:4px;font-size:12px;">${JSON.stringify(payload.metadata, null, 2)}</pre>`
        : '';

      for (const email of recipients) {
        await sendDirectEmailHandler({
          email,
          subject: `System Alert [${payload.severity.toUpperCase()}]: ${payload.title}`,
          customHtml: `
            <div style="font-family:sans-serif;max-width:600px;">
              <h2 style="color:${payload.severity === 'critical' ? '#dc2626' : '#f59e0b'};">${severityEmoji} ${payload.title}</h2>
              <p><strong>Severity:</strong> ${payload.severity.toUpperCase()}</p>
              <p><strong>Category:</strong> ${payload.category}</p>
              <p><strong>Message:</strong> ${payload.message}</p>
              ${metadataHtml}
              <p style="color:#888;font-size:12px;">Timestamp: ${new Date().toISOString()}</p>
            </div>
          `,
          type: 'system',
          action: `alert_${payload.category}_${payload.severity}`,
        });
      }
    } catch (err: any) {
      logger.error(`[ALERTING] Email dispatch failed: ${err.message}`);
    }
  }

  private static async sendToWebhook(payload: AlertPayload): Promise<void> {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (!webhookUrl) return;

      const body = {
        text: `[${payload.severity.toUpperCase()}] **${payload.title}**\n${payload.message}`,
        // Slack-compatible format
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${payload.severity === 'critical' ? '🚨' : '⚠️'} ${payload.title}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Severity:* ${payload.severity.toUpperCase()}` },
              { type: 'mrkdwn', text: `*Category:* ${payload.category}` },
            ],
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: payload.message },
          },
        ],
        // Additional metadata for non-Slack consumers
        severity: payload.severity,
        category: payload.category,
        metadata: payload.metadata,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        logger.warn(`[ALERTING] Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      logger.error(`[ALERTING] Webhook dispatch failed: ${err.message}`);
    }
  }

  private static async sendAdminNotification(payload: AlertPayload): Promise<void> {
    try {
      await createAdminNotificationHandler({
        title: `${payload.severity === 'critical' ? '🚨' : '⚠️'} ${payload.title}`,
        message: payload.message,
        type: payload.category === 'payment' ? 'payment' : 'system',
      });
    } catch (err: any) {
      logger.error(`[ALERTING] Admin notification failed: ${err.message}`);
    }
  }

  // ── Convenience Methods ──

  static async paymentFailure(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: `Payment system alert: ${details.error || 'Unknown error'}`,
      severity: 'critical',
      category: 'payment',
      metadata: details,
    });
  }

  static async inventoryAnomaly(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: `Inventory integrity issue detected`,
      severity: 'high',
      category: 'inventory',
      metadata: details,
    });
  }

  static async queueFailure(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: `Background job system failure`,
      severity: 'high',
      category: 'queue',
      metadata: details,
    });
  }

  static async securityAlert(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: `Security event detected`,
      severity: 'critical',
      category: 'security',
      metadata: details,
    });
  }

  static async databaseAlert(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: `Database health issue`,
      severity: 'high',
      category: 'database',
      metadata: details,
    });
  }

  static async backupAlert(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: `Backup system alert`,
      severity: 'high',
      category: 'backup',
      metadata: details,
    });
  }

  static async systemAlert(title: string, details: Record<string, any>): Promise<void> {
    await this.fire({
      title,
      message: details.message || 'System event detected',
      severity: (details.severity as AlertSeverity) || 'medium',
      category: 'system',
      metadata: details,
    });
  }
}
