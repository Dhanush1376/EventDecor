import WhatsAppApprovalRequest from '../../../models/WhatsAppApprovalRequest';
import logger from '../../../config/logger';

export class WhatsAppApprovalService {
  /**
   * Generates a new pending Approval Request when RBAC intercepts a restricted action.
   */
  static async createApprovalRequest(
    userId: string,
    actionTitle: string,
    targetAction: string,
    targetEndpoint: string,
    targetMethod: string,
    payload: any,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 72-hour validity window

    await WhatsAppApprovalRequest.create({
      requestedBy: userId,
      actionTitle,
      targetAction,
      targetEndpoint,
      targetMethod,
      payload,
      status: 'pending',
      expiresAt,
    });

    logger.info(
      `[WhatsAppApprovalService] Created approval request for ${targetAction} by user ${userId}`,
    );
    // In a real system, you would emit a WebSocket event or email to approvers here.
  }

  /**
   * Approves a request. Note: To perfectly implement this, the backend should natively HTTP call itself
   * or inject the payload directly into the target service. For this architectural implementation, we will mark
   * it as approved and allow the frontend to safely re-trigger the original endpoint with an override flag, or
   * execute it right here using internal service locators.
   */
  static async approveRequest(
    requestId: string,
    approverId: string,
    comments?: string,
  ): Promise<any> {
    const request = await WhatsAppApprovalRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Approval request not found or not pending.');
    }

    if (request.requestedBy.toString() === approverId.toString()) {
      throw new Error('Four-Eyes Principle Violation: You cannot approve your own request.');
    }

    request.status = 'approved';
    request.approvedBy = approverId as any;
    request.comments = comments;
    await request.save();

    logger.info(`[WhatsAppApprovalService] Request ${requestId} approved by ${approverId}`);

    // In a microservices architecture, you'd throw the payload into an EventBus.
    // For this monolith, returning the payload allows the Controller to pass it to the right Service.
    return request;
  }

  static async rejectRequest(requestId: string, approverId: string, reason: string): Promise<void> {
    const request = await WhatsAppApprovalRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Approval request not found or not pending.');
    }

    request.status = 'rejected';
    request.approvedBy = approverId as any;
    request.comments = reason;
    await request.save();

    logger.info(`[WhatsAppApprovalService] Request ${requestId} rejected by ${approverId}`);
  }
}
