import {
  NotificationEvent,
  NotificationChannel,
  RecipientRole,
  EventRegistryConfig,
} from './types';

class Registry {
  private events: Map<NotificationEvent, EventRegistryConfig> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry() {
    // --- ORDER EVENTS ---
    this.register({
      event: NotificationEvent.ORDER_CREATED,
      category: 'order',
      idempotent: true,
      recipients: [
        {
          role: RecipientRole.CUSTOMER,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'high' },
            { channel: NotificationChannel.IN_APP, enabled: true },
            { channel: NotificationChannel.WHATSAPP, enabled: true },
          ],
        },
        {
          role: RecipientRole.ADMIN,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'normal' },
            { channel: NotificationChannel.SLACK, enabled: true },
          ],
        },
      ],
    });

    this.register({
      event: NotificationEvent.ORDER_DELIVERED,
      category: 'order',
      recipients: [
        {
          role: RecipientRole.CUSTOMER,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'normal' },
            { channel: NotificationChannel.IN_APP, enabled: true },
            { channel: NotificationChannel.SMS, enabled: true },
          ],
        },
      ],
    });

    // --- PAYMENT EVENTS ---
    this.register({
      event: NotificationEvent.PAYMENT_FAILED,
      category: 'payment',
      recipients: [
        {
          role: RecipientRole.CUSTOMER,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'high' },
            { channel: NotificationChannel.WHATSAPP, enabled: true },
          ],
        },
        {
          role: RecipientRole.FINANCE,
          channels: [{ channel: NotificationChannel.SLACK, enabled: true }],
        },
      ],
    });

    this.register({
      event: NotificationEvent.PAYMENT_DISPUTED,
      category: 'payment',
      recipients: [
        {
          role: RecipientRole.FINANCE,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'critical' },
            { channel: NotificationChannel.SLACK, enabled: true, priority: 'critical' },
          ],
        },
      ],
    });

    this.register({
      event: NotificationEvent.REFUND_FAILED,
      category: 'payment',
      recipients: [
        {
          role: RecipientRole.FINANCE,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'critical' },
            { channel: NotificationChannel.SLACK, enabled: true, priority: 'critical' },
          ],
        },
        {
          role: RecipientRole.ADMIN,
          channels: [{ channel: NotificationChannel.EMAIL, enabled: true, priority: 'critical' }],
        },
      ],
    });

    // --- AUTH EVENTS ---
    this.register({
      event: NotificationEvent.OTP_VERIFICATION,
      category: 'account',
      recipients: [
        {
          role: RecipientRole.CUSTOMER,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'critical' },
            { channel: NotificationChannel.SMS, enabled: true, priority: 'critical' }, // Fallback/primary depending on user selection
          ],
        },
      ],
    });

    this.register({
      event: NotificationEvent.SECURITY_ALERT,
      category: 'account',
      recipients: [
        {
          role: RecipientRole.CUSTOMER,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'critical' },
            { channel: NotificationChannel.IN_APP, enabled: true, priority: 'critical' },
          ],
        },
      ],
    });

    // --- BOOKING EVENTS ---
    this.register({
      event: NotificationEvent.BOOKING_CREATED,
      category: 'booking',
      recipients: [
        {
          role: RecipientRole.CUSTOMER,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'high' },
            { channel: NotificationChannel.IN_APP, enabled: true },
          ],
        },
        {
          role: RecipientRole.ADMIN,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'high' },
            { channel: NotificationChannel.SLACK, enabled: true },
          ],
        },
      ],
    });

    // --- SYSTEM ALERTS ---
    this.register({
      event: NotificationEvent.DATABASE_ERROR,
      category: 'system',
      recipients: [
        {
          role: RecipientRole.SUPER_ADMIN,
          channels: [
            { channel: NotificationChannel.EMAIL, enabled: true, priority: 'critical' },
            { channel: NotificationChannel.SLACK, enabled: true, priority: 'critical' },
          ],
        },
      ],
    });

    // Continue registering all other events here...
    // To keep it concise for the implementation plan, we assume all 70 events are registered with appropriate routing.
  }

  public register(config: EventRegistryConfig) {
    this.events.set(config.event, config);
  }

  public getConfig(event: NotificationEvent): EventRegistryConfig | undefined {
    return this.events.get(event);
  }

  public getAllEvents(): NotificationEvent[] {
    return Array.from(this.events.keys());
  }
}

export const NotificationRegistry = new Registry();
