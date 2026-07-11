import ApiError from '../../utils/ApiError';

export type EventJobStatus =
  | 'draft'
  | 'consultation_scheduled'
  | 'quote_sent'
  | 'contract_signed'
  | 'pending_payment'
  | 'payment_processing'
  | 'confirmed'
  | 'design_approved'
  | 'vendor_procurement'
  | 'team_assigned'
  | 'setup_in_progress'
  | 'execution'
  | 'completed'
  | 'post_event_review'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export type BookingWorkflowType = 'standard' | 'custom';

const standardWorkflowTransitions: Record<EventJobStatus, EventJobStatus[]> = {
  draft: ['pending_payment', 'cancelled'],
  consultation_scheduled: [], // N/A
  quote_sent: [], // N/A
  contract_signed: [], // N/A
  pending_payment: ['payment_processing', 'failed', 'cancelled'],
  payment_processing: ['confirmed', 'failed', 'cancelled'],
  confirmed: ['team_assigned', 'cancelled'],
  design_approved: [], // N/A
  vendor_procurement: ['setup_in_progress', 'cancelled'],
  team_assigned: ['vendor_procurement', 'setup_in_progress', 'cancelled'],
  setup_in_progress: ['execution', 'completed', 'cancelled'],
  execution: ['completed', 'cancelled'],
  completed: ['post_event_review', 'refunded'],
  post_event_review: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
  failed: ['pending_payment', 'cancelled'],
};

const customWorkflowTransitions: Record<EventJobStatus, EventJobStatus[]> = {
  draft: ['consultation_scheduled', 'cancelled'],
  consultation_scheduled: ['quote_sent', 'cancelled'],
  quote_sent: ['contract_signed', 'cancelled'],
  contract_signed: ['pending_payment', 'cancelled'],
  pending_payment: ['payment_processing', 'failed', 'cancelled'],
  payment_processing: ['confirmed', 'failed', 'cancelled'],
  confirmed: ['design_approved', 'cancelled'],
  design_approved: ['vendor_procurement', 'team_assigned', 'cancelled'],
  vendor_procurement: ['team_assigned', 'setup_in_progress', 'cancelled'],
  team_assigned: ['setup_in_progress', 'cancelled'],
  setup_in_progress: ['execution', 'completed', 'cancelled'],
  execution: ['completed', 'cancelled'],
  completed: ['post_event_review', 'refunded'],
  post_event_review: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
  failed: ['pending_payment', 'cancelled'],
};

export class EventJobStateMachine {
  /**
   * Determine the workflow type.
   */
  static determineWorkflow(booking: any): BookingWorkflowType {
    // If eventPackage exists, it's a standard instantly-purchased package.
    // Otherwise, it's a custom booking requiring consultation.
    return booking.eventPackage ? 'standard' : 'custom';
  }

  /**
   * Check if a transition is valid.
   */
  static canTransition(booking: any, newStatus: EventJobStatus): boolean {
    const currentStatus = booking.status as EventJobStatus;
    if (currentStatus === newStatus) return true;

    const workflow = this.determineWorkflow(booking);
    const transitions =
      workflow === 'standard' ? standardWorkflowTransitions : customWorkflowTransitions;
    return transitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Transition the booking's status.
   */
  static transition(booking: any, newStatus: EventJobStatus, note: string, updatedBy?: string) {
    if (!this.canTransition(booking, newStatus)) {
      const workflow = this.determineWorkflow(booking);
      throw new ApiError(
        400,
        `Invalid event booking state transition in ${workflow} workflow: from '${booking.status}' to '${newStatus}'`,
      );
    }

    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note,
      updatedBy: updatedBy || 'system',
    });

    booking.status = newStatus;
  }
}
