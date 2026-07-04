/**
 * Centralized status translation layer mapping backend states to human-friendly labels.
 * Each status gets: human label, short explanation, visual tone, and recommended next action.
 */

export const OrderStatusTranslations = {
  pending: {
    label: 'New Order',
    description: 'Order received but not yet processed',
    tone: 'neutral',
    action: 'Review order details',
  },
  processing: {
    label: 'In Progress',
    description: 'Currently being prepared or painted',
    tone: 'warning',
    action: 'Update production stage',
  },
  shipped: {
    label: 'Dispatched',
    description: 'Handed over to courier',
    tone: 'info',
    action: 'Track shipment',
  },
  delivered: {
    label: 'Delivered',
    description: 'Customer received the item',
    tone: 'success',
    action: 'View delivery proof',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Order was cancelled',
    tone: 'error',
    action: 'View cancellation reason',
  },
};

export const ProductionStageTranslations = {
  not_started: { label: 'Not Started', description: 'Waiting for artisan', tone: 'neutral' },
  painting: { label: 'Painting', description: 'Currently being painted', tone: 'warning' },
  drying: { label: 'Drying', description: 'Drying before QA', tone: 'info' },
  quality_check: {
    label: 'Quality Check',
    description: 'Undergoing final inspection',
    tone: 'warning',
  },
  ready: {
    label: 'Ready for Packing',
    description: 'Passed QA, waiting to be packed',
    tone: 'success',
  },
};

export const RentalStatusTranslations = {
  reserved: { label: 'Reserved', description: 'Booked for a future date', tone: 'neutral' },
  active: { label: 'Active', description: 'Currently with customer', tone: 'info' },
  overdue: {
    label: 'Overdue',
    description: 'Past due date',
    tone: 'error',
    action: 'Contact customer',
  },
  returned: { label: 'Returned', description: 'Brought back, pending inspection', tone: 'warning' },
  completed: { label: 'Completed', description: 'Inspected and closed', tone: 'success' },
};

export const ReturnStatusTranslations = {
  pending: {
    label: 'Needs Review',
    description: 'Customer requested a return',
    tone: 'warning',
    action: 'Review request',
  },
  approved: { label: 'Approved', description: 'Waiting for item arrival', tone: 'info' },
  received: { label: 'Received', description: 'Item received, pending refund', tone: 'warning' },
  refunded: { label: 'Refunded', description: 'Money sent back to customer', tone: 'success' },
  rejected: { label: 'Rejected', description: 'Return request denied', tone: 'error' },
};

export function getStatusTranslation(entityType, statusCode) {
  const code = (statusCode || '').toLowerCase();
  switch (entityType) {
    case 'order':
      return OrderStatusTranslations[code] || { label: code || 'Unknown', tone: 'neutral' };
    case 'production':
      return ProductionStageTranslations[code] || { label: code || 'Unknown', tone: 'neutral' };
    case 'rental':
      return RentalStatusTranslations[code] || { label: code || 'Unknown', tone: 'neutral' };
    case 'return':
      return ReturnStatusTranslations[code] || { label: code || 'Unknown', tone: 'neutral' };
    default:
      return { label: code || 'Unknown', tone: 'neutral' };
  }
}
