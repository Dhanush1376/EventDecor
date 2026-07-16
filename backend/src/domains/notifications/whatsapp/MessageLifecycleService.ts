import WhatsAppMessageLog, { IWhatsAppMessageLog } from '../../../models/WhatsAppMessageLog';
import logger from '../../../config/logger';

export type MessageState =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'expired'
  | 'cancelled';

export class MessageLifecycleService {
  /**
   * Valid state transitions matrix.
   * Defines which states can transition to which other states.
   */
  private static readonly VALID_TRANSITIONS: Record<MessageState, MessageState[]> = {
    pending: ['queued', 'cancelled', 'expired'],
    queued: ['processing', 'cancelled', 'expired'],
    processing: ['sent', 'failed', 'cancelled', 'expired'],
    sent: ['delivered', 'read', 'failed', 'expired'], // Meta can send failure after sent
    delivered: ['read'],
    read: [], // Terminal state
    failed: ['queued', 'cancelled'], // Can be retried (back to queued) or cancelled
    expired: [], // Terminal state
    cancelled: [], // Terminal state
  };

  /**
   * Checks if a transition from current to target state is valid.
   */
  public static isValidTransition(
    currentStatus: MessageState,
    targetStatus: MessageState,
  ): boolean {
    const allowed = this.VALID_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  /**
   * Transitions a message to a new state if the transition is valid.
   * @param messageId The unique ID of the message
   * @param newStatus The target state
   * @param options Additional metadata, reason, or specific fields to update
   */
  public static async transitionTo(
    messageId: string,
    newStatus: MessageState,
    options: {
      metadata?: any;
      reason?: string;
      cancelledBy?: string;
      apiProvider?: string;
      apiMessageId?: string;
      apiResponse?: any;
    } = {},
  ): Promise<IWhatsAppMessageLog | null> {
    const log = await WhatsAppMessageLog.findOne({ messageId });

    if (!log) {
      logger.error(`[MessageLifecycleService] Transition failed: Message ${messageId} not found.`);
      return null;
    }

    const currentStatus = log.deliveryStatus as MessageState;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      logger.error(
        `[MessageLifecycleService] Invalid transition: Cannot move message ${messageId} from ${currentStatus} to ${newStatus}.`,
      );
      throw new Error(`Invalid message state transition from ${currentStatus} to ${newStatus}`);
    }

    // Prepare updates
    log.deliveryStatus = newStatus;
    const historyEntry = {
      status: newStatus,
      timestamp: new Date(),
      metadata: options.metadata,
      reason: options.reason,
    };
    log.statusHistory.push(historyEntry);

    // Update specific timestamp fields based on status
    if (newStatus === 'sent') log.sentAt = new Date();
    if (newStatus === 'delivered') log.deliveredAt = new Date();
    if (newStatus === 'read') log.readAt = new Date();
    if (newStatus === 'cancelled') {
      log.cancelledAt = new Date();
      log.cancelledBy = options.cancelledBy;
      log.cancellationReason = options.reason;
    }

    // Update optional API fields if provided
    if (options.apiProvider) log.apiProvider = options.apiProvider;
    if (options.apiMessageId) log.apiMessageId = options.apiMessageId;
    if (options.apiResponse) log.apiResponse = options.apiResponse;
    if (newStatus === 'failed' && options.reason) log.failureReason = options.reason;

    await log.save();

    logger.info(
      `[MessageLifecycleService] Message ${messageId} transitioned: ${currentStatus} -> ${newStatus}`,
    );

    // Here we can also trigger events if we implement an EventBus
    // eventBus.emit('whatsapp.message.status_changed', { messageId, oldStatus: currentStatus, newStatus, ... });

    return log;
  }
}
