import { Clock } from 'lucide-react';
import React from 'react';
import { format } from 'date-fns';

const STAGE_CONFIG = {
  submitted: { icon: 'assignment', color: 'text-info', bg: 'bg-info/10', border: 'border-info' },
  approved: {
    icon: 'thumb_up',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
  },
  rejected: { icon: 'cancel', color: 'text-error', bg: 'bg-error/10', border: 'border-error' },
  cancelled: {
    icon: 'do_not_disturb_on',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-variant',
    border: 'border-outline',
  },
  pickup_assigned: {
    icon: 'local_shipping',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
  },
  pickup_accepted: {
    icon: 'schedule',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
  },
  picked_up: { icon: 'inventory_2', color: 'text-info', bg: 'bg-info/10', border: 'border-info' },
  reached_warehouse: {
    icon: 'warehouse',
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info',
  },
  inspection_started: {
    icon: 'troubleshoot',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning',
  },
  inspection_passed: {
    icon: 'fact_check',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
  },
  refund_triggered: {
    icon: 'currency_rupee',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
  },
  completed: {
    icon: 'check_circle',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success',
  },
};

const ReturnTimeline = ({
  stages = [],
  currentStatus = 'submitted',
  timeline = [],
  variant = 'full',
}) => {
  // Map timeline entries by action/status
  const timelineMap = timeline.reduce((acc, entry) => {
    // Attempt to parse action into a status string
    let status = entry.action.toLowerCase().replace(/ /g, '_');
    // Normalize some known actions
    if (status.includes('submitted')) status = 'submitted';
    if (status.includes('approved')) status = 'approved';
    if (status.includes('rejected')) status = 'rejected';
    if (status.includes('cancelled')) status = 'cancelled';

    acc[status] = entry;
    return acc;
  }, {});

  const currentIndex = stages.findIndex((s) => s === currentStatus);

  if (variant === 'compact') {
    return (
      <div className="flex items-center w-full max-w-sm">
        {stages.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const config = STAGE_CONFIG[stage] || STAGE_CONFIG.submitted;

          return (
            <React.Fragment key={stage}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${
                  isCompleted
                    ? `${config.bg} ${config.border} ${config.color}`
                    : 'border-outline-variant/30 text-on-surface-variant'
                } ${isCurrent ? 'ring-2 ring-primary/20 ring-offset-2' : ''}`}
                title={stage.replace('_', ' ')}
              >
                {isCompleted && (
                  <span className="material-symbols-outlined text-[14px]">{config.icon}</span>
                )}
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${idx < currentIndex ? config.bg : 'bg-outline-variant/20'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Full Variant
  return (
    <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[1.75rem] before:w-px before:-translate-x-px before:bg-outline-variant/30">
      {stages.map((stage, idx) => {
        const isCompleted = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        const isRejectedOrCancelled = stage === 'rejected' || stage === 'cancelled';

        // Don't render rejected/cancelled unless it's actually in that state
        if (isRejectedOrCancelled && currentStatus !== stage) return null;

        const config = STAGE_CONFIG[stage] || STAGE_CONFIG.submitted;
        const entry = timelineMap[stage];
        const dateStr = entry?.timestamp
          ? format(new Date(entry.timestamp), 'MMM dd, yyyy h:mm a')
          : null;

        return (
          <div
            key={stage}
            className={`relative flex gap-6 ${isCompleted ? 'opacity-100' : 'opacity-50'}`}
          >
            <div
              className={`absolute -left-6 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-surface ${
                isCompleted
                  ? `${config.border} ${config.color}`
                  : 'border-outline-variant/40 text-on-surface-variant'
              } ${isCurrent ? 'shadow-[0_0_0_4px_var(--color-primary-10)]' : ''}`}
            >
              <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
            </div>

            <div className="flex-1 pt-1">
              <h4
                className={`text-sm font-semibold capitalize ${isCompleted ? 'text-on-surface' : 'text-on-surface-variant'}`}
              >
                {stage.replace(/_/g, ' ')}
              </h4>

              {entry?.description && (
                <p className="text-sm text-on-surface-variant mt-1">{entry.description}</p>
              )}

              {dateStr && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-on-surface-variant">
                  <Clock className="text-[14px]" strokeWidth={1.5} />
                  {dateStr}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReturnTimeline;
