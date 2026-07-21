export enum NotificationEvent {
  // Order Events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_PROCESSING = 'ORDER_PROCESSING',
  ORDER_PACKED = 'ORDER_PACKED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_OUT_FOR_DELIVERY = 'ORDER_OUT_FOR_DELIVERY',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',

  // Payment Events
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_DISPUTED = 'PAYMENT_DISPUTED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  REFUND_FAILED = 'REFUND_FAILED',

  // Auth & Account Events
  CUSTOMER_REGISTERED = 'CUSTOMER_REGISTERED',
  CUSTOMER_LOGIN = 'CUSTOMER_LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  SECURITY_ALERT = 'SECURITY_ALERT',

  // Booking & Rental Events
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_UPDATED = 'BOOKING_UPDATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_PAYMENT_FAILED = 'BOOKING_PAYMENT_FAILED',
  RENTAL_CONFIRMED = 'RENTAL_CONFIRMED',
  RENTAL_CANCELLED = 'RENTAL_CANCELLED',
  RENTAL_PAYMENT_FAILED = 'RENTAL_PAYMENT_FAILED',
  RENTAL_DEPOSIT_REFUNDED = 'RENTAL_DEPOSIT_REFUNDED',
  RENTAL_DEPOSIT_FORFEITED = 'RENTAL_DEPOSIT_FORFEITED',

  // Engagement Events
  WISHLIST_PRICE_DROP = 'WISHLIST_PRICE_DROP',
  BACK_IN_STOCK = 'BACK_IN_STOCK',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  ABANDONED_CART = 'ABANDONED_CART',
  COUPON_EXPIRING = 'COUPON_EXPIRING',

  // Communication & Support
  CONTACT_FORM_SUBMITTED = 'CONTACT_FORM_SUBMITTED',
  SUPPORT_TICKET_CREATED = 'SUPPORT_TICKET_CREATED',
  SUPPORT_TICKET_REPLIED = 'SUPPORT_TICKET_REPLIED',
  SUPPORT_TICKET_CLOSED = 'SUPPORT_TICKET_CLOSED',

  // Custom Orders
  CUSTOM_ORDER_SUBMITTED = 'CUSTOM_ORDER_SUBMITTED',
  QUOTATION_SENT = 'QUOTATION_SENT',
  QUOTATION_APPROVED = 'QUOTATION_APPROVED',
  QUOTATION_REJECTED = 'QUOTATION_REJECTED',
  CUSTOM_ORDER_CHAT_UPDATE = 'CUSTOM_ORDER_CHAT_UPDATE',

  // Admin & System Events
  VENDOR_REGISTERED = 'VENDOR_REGISTERED',
  INVENTORY_LOW = 'INVENTORY_LOW',
  INVENTORY_OUT = 'INVENTORY_OUT',
  DAILY_SALES_REPORT = 'DAILY_SALES_REPORT',
  WEEKLY_REPORT = 'WEEKLY_REPORT',
  MONTHLY_REPORT = 'MONTHLY_REPORT',
  FAILED_LOGIN_ATTEMPTS = 'FAILED_LOGIN_ATTEMPTS',
  ADMIN_LOGIN_ALERT = 'ADMIN_LOGIN_ALERT',

  // Critical System Alerts
  DATABASE_ERROR = 'DATABASE_ERROR',
  API_FAILURE = 'API_FAILURE',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',
  WEBHOOK_FAILURE = 'WEBHOOK_FAILURE',
  QUEUE_FAILURE = 'QUEUE_FAILURE',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  STORAGE_FAILURE = 'STORAGE_FAILURE',
  RATE_LIMIT_WARNING = 'RATE_LIMIT_WARNING',
  CRITICAL_EXCEPTION = 'CRITICAL_EXCEPTION',
  BACKUP_COMPLETED = 'BACKUP_COMPLETED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  SERVER_ERROR = 'SERVER_ERROR',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  PUSH = 'PUSH',
}

export enum RecipientRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface NotificationPayload {
  aggregateId?: string;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  priority?: 'critical' | 'high' | 'normal' | 'low';
}

export interface RecipientConfig {
  role: RecipientRole;
  channels: ChannelConfig[];
  cc?: string[];
  bcc?: string[];
}

export interface EventRegistryConfig {
  event: NotificationEvent;
  category:
    | 'order'
    | 'payment'
    | 'account'
    | 'booking'
    | 'rental'
    | 'engagement'
    | 'support'
    | 'custom_order'
    | 'admin'
    | 'system';
  recipients: RecipientConfig[];
  idempotent?: boolean; // Ensure only sent once per unique payload
}

export interface NotificationContext {
  eventId: string; // Unique ID for the event occurrence (e.g. outbox event id)
  aggregateId: string; // The domain entity ID (e.g. Order ID)
  correlationId?: string; // For tracing across systems
  requestId?: string; // Web request ID
  actorId?: string; // User who triggered this (if any)
  tenantId?: string; // For multi-tenant support
  priority: 'critical' | 'high' | 'normal' | 'low';
  locale?: string;
  timezone?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface IEmailProvider {
  name: string;
  isConfigured(): boolean;
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  headers?: Record<string, string>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: Error;
}
