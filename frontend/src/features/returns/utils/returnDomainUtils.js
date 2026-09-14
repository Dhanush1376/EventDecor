/**
 * Pure Domain Calculations & Styling Rules for Returns & Exchanges
 */

export const formatINR = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const RETURN_HAPPY_PATH = [
  'Submitted',
  'Approved',
  'Item Picked Up',
  'QC Passed',
  'Completed',
];

export const EXCHANGE_HAPPY_PATH = [
  'Submitted',
  'Approved',
  'Item Picked Up',
  'QC Passed',
  'Dispatched',
  'Completed',
];

export const STEP_ICONS = {
  Submitted: 'assignment',
  Approved: 'check_circle',
  'Item Picked Up': 'local_shipping',
  'QC Passed': 'fact_check',
  Dispatched: 'inventory_2',
  Completed: 'verified',
  Rejected: 'cancel',
  Cancelled: 'cancel',
};

export const STEP_COLORS = {
  Submitted: {
    activeBg: 'bg-amber-500',
    activeBorder: 'border-amber-500',
    activeText: 'text-white',
    completedBorder: 'border-amber-500',
    completedText: 'text-amber-600',
    pulse: 'bg-amber-500',
    progress: 'bg-amber-500',
  },
  Approved: {
    activeBg: 'bg-blue-500',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    completedBorder: 'border-blue-500',
    completedText: 'text-blue-600',
    pulse: 'bg-blue-500',
    progress: 'bg-blue-500',
  },
  'Item Picked Up': {
    activeBg: 'bg-indigo-600',
    activeBorder: 'border-indigo-600',
    activeText: 'text-white',
    completedBorder: 'border-indigo-600',
    completedText: 'text-indigo-600',
    pulse: 'bg-indigo-600',
    progress: 'bg-indigo-600',
  },
  'QC Passed': {
    activeBg: 'bg-purple-600',
    activeBorder: 'border-purple-600',
    activeText: 'text-white',
    completedBorder: 'border-purple-600',
    completedText: 'text-purple-600',
    pulse: 'bg-purple-600',
    progress: 'bg-purple-600',
  },
  Dispatched: {
    activeBg: 'bg-blue-600',
    activeBorder: 'border-blue-600',
    activeText: 'text-white',
    completedBorder: 'border-blue-600',
    completedText: 'text-blue-600',
    pulse: 'bg-blue-600',
    progress: 'bg-blue-600',
  },
  Completed: {
    activeBg: 'bg-emerald-500',
    activeBorder: 'border-emerald-500',
    activeText: 'text-white',
    completedBorder: 'border-emerald-500',
    completedText: 'text-emerald-600',
    pulse: 'bg-emerald-500',
    progress: 'bg-emerald-500',
  },
};

export const mapStatusToStep = (status) => {
  if (['completed', 'refund_completed', 'refund_initiated', 'refund_settled'].includes(status)) {
    return 'Completed';
  }
  if (['inspection_completed', 'qc_passed', 'qc_approved'].includes(status)) {
    return 'QC Passed';
  }
  if (
    [
      'return_picked_up',
      'return_courier_assigned',
      'return_in_transit',
      'return_received',
      'inspection_started',
    ].includes(status)
  ) {
    return 'Item Picked Up';
  }
  if (status === 'approved') {
    return 'Approved';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  return 'Submitted';
};

export const mapExchangeStatusToStep = (status, replacementStatus) => {
  if (['completed'].includes(status) || replacementStatus === 'delivered') {
    return 'Completed';
  }
  if (replacementStatus === 'shipped') {
    return 'Dispatched';
  }
  if (
    ['inspection_completed', 'refund_initiated', 'refund_completed', 'qc_passed'].includes(
      status,
    ) ||
    ['reserved'].includes(replacementStatus)
  ) {
    return 'QC Passed';
  }
  if (['return_received', 'inspection_started'].includes(status)) {
    return 'QC Passed';
  }
  if (['return_picked_up', 'return_in_transit'].includes(status)) {
    return 'Item Picked Up';
  }
  if (['approved', 'return_courier_assigned'].includes(status)) {
    return 'Approved';
  }
  if (status === 'rejected') {
    return 'Rejected';
  }
  if (status === 'cancelled') {
    return 'Cancelled';
  }
  return 'Submitted';
};

export const getReturnTimelineCardStyle = (currentStepName, isFailed) => {
  if (isFailed) {
    return 'bg-gradient-to-r from-rose-500/[0.035] via-rose-500/[0.01] to-white dark:to-[#26241f] border-rose-500/25 shadow-xs';
  }
  if (currentStepName === 'Completed') {
    return 'bg-gradient-to-r from-emerald-500/[0.035] via-emerald-500/[0.01] to-white dark:to-[#26241f] border-emerald-500/25 shadow-xs';
  }
  if (
    currentStepName === 'Approved' ||
    currentStepName === 'Item Picked Up' ||
    currentStepName === 'QC Passed' ||
    currentStepName === 'Dispatched'
  ) {
    return 'bg-gradient-to-r from-blue-500/[0.035] via-blue-500/[0.01] to-white dark:to-[#26241f] border-blue-500/25 shadow-xs';
  }
  return 'bg-gradient-to-r from-amber-500/[0.045] via-amber-500/[0.015] to-white dark:to-[#26241f] border-amber-500/30 shadow-xs';
};
