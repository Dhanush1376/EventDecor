import React from 'react';
import { m as motion } from 'framer-motion';

const allStatuses = ['Pending', 'Confirmed', 'Processing', 'Delivered', 'Settled', 'Cancelled'];

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Processing: 'inventory_2',
  Delivered: 'local_shipping',
  Settled: 'verified',
  Cancelled: 'cancel',
};

const STATUS_COLORS = {
  Pending: {
    activeBg: 'bg-amber-500',
    activeBorder: 'border-amber-500',
    activeText: 'text-white',
    completedBorder: 'border-amber-500',
    completedText: 'text-amber-600',
    pulse: 'bg-amber-500',
    progress: 'bg-amber-500',
  },
  Confirmed: {
    activeBg: 'bg-blue-500',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    completedBorder: 'border-blue-500',
    completedText: 'text-blue-600',
    pulse: 'bg-blue-500',
    progress: 'bg-blue-500',
  },
  Processing: {
    activeBg: 'bg-purple-500',
    activeBorder: 'border-purple-500',
    activeText: 'text-white',
    completedBorder: 'border-purple-500',
    completedText: 'text-purple-600',
    pulse: 'bg-purple-500',
    progress: 'bg-purple-500',
  },
  Delivered: {
    activeBg: 'bg-emerald-500',
    activeBorder: 'border-emerald-500',
    activeText: 'text-white',
    completedBorder: 'border-emerald-500',
    completedText: 'text-emerald-600',
    pulse: 'bg-emerald-500',
    progress: 'bg-emerald-500',
  },
  Settled: {
    activeBg: 'bg-emerald-600',
    activeBorder: 'border-emerald-600',
    activeText: 'text-white',
    completedBorder: 'border-emerald-600',
    completedText: 'text-emerald-600',
    pulse: 'bg-emerald-600',
    progress: 'bg-emerald-600',
  },
  Cancelled: {
    activeBg: 'bg-rose-500',
    activeBorder: 'border-rose-500',
    activeText: 'text-white',
    completedBorder: 'border-rose-500',
    completedText: 'text-rose-600',
    pulse: 'bg-rose-500',
    progress: 'bg-rose-500',
  },
};

export function OrderStatusTimeline({ order, updateOrderStatus }) {
  const rawStatus = (
    order?.status ||
    order?.orderStatus ||
    order?.rawOrder?.orderStatus ||
    order?.rawOrder?.status ||
    'Pending'
  )
    .toString()
    .trim();

  // Normalize string to match allStatuses case
  const getNormalizedStatus = (s) => {
    const lower = (s || '').toLowerCase().trim();
    if (lower === 'pending' || lower === 'payment pending' || lower === 'placed') return 'Pending';
    if (lower === 'confirmed') return 'Confirmed';
    if (
      lower === 'processing' ||
      lower === 'packed' ||
      lower === 'shipped' ||
      lower === 'ready to ship' ||
      lower === 'out for delivery'
    )
      return 'Processing';
    if (lower === 'delivered') return 'Delivered';
    if (lower === 'settled') return 'Settled';
    if (lower === 'cancelled') return 'Cancelled';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const normalizedStatus = getNormalizedStatus(rawStatus);
  const isFailed = normalizedStatus === 'Cancelled';
  const happyPath = ['Pending', 'Confirmed', 'Processing', 'Delivered', 'Settled'];
  const effectiveStatus = happyPath.includes(normalizedStatus)
    ? normalizedStatus
    : normalizedStatus === 'Cancelled'
      ? 'Cancelled'
      : 'Pending';
  const currentIdx = happyPath.indexOf(effectiveStatus);
  const orderTargetId = order?.id || order?._id;

  // Ultra-light, airy status gradient card wash matching payments & returns
  const getTimelineCardStyle = () => {
    if (effectiveStatus === 'Delivered' || effectiveStatus === 'Settled') {
      return 'bg-gradient-to-r from-emerald-500/[0.035] via-emerald-500/[0.01] to-white dark:to-[#26241f] border-emerald-500/25';
    }
    if (effectiveStatus === 'Cancelled') {
      return 'bg-gradient-to-r from-rose-500/[0.035] via-rose-500/[0.01] to-white dark:to-[#26241f] border-rose-500/25';
    }
    if (effectiveStatus === 'Processing' || effectiveStatus === 'Confirmed') {
      return 'bg-gradient-to-r from-blue-500/[0.035] via-blue-500/[0.01] to-white dark:to-[#26241f] border-blue-500/25';
    }
    return 'bg-gradient-to-r from-amber-500/[0.045] via-amber-500/[0.015] to-white dark:to-[#26241f] border-amber-500/30';
  };

  return (
    <div
      className={`rounded-[6px] shadow-xs border overflow-hidden transition-all ${getTimelineCardStyle()}`}
    >
      <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight">
            Lifecycle Progression
          </h3>
          <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium hidden sm:block mt-0.5">
            Track and override the order's current stage.
          </p>
        </div>
        {/* Status Dropdown to Update Order Status */}
        <div className="relative w-[140px] sm:w-[155px] h-8 shrink-0">
          <select
            value={effectiveStatus}
            onChange={(e) => updateOrderStatus(orderTargetId, e.target.value)}
            style={{ backgroundImage: 'none' }}
            className="admin-no-arrow w-full h-8 !min-h-[32px] !max-h-[32px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[4px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors truncate"
          >
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-stone-500">
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-8 overflow-hidden">
        <div className="flex items-center justify-between relative w-full max-w-full">
          {/* Thin Background Line */}
          <div className="absolute left-[10%] right-[10%] top-[20px] h-[2px] bg-[var(--admin-border)] z-0">
            {!isFailed && currentIdx >= 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentIdx / (happyPath.length - 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`absolute left-0 top-0 bottom-0 ${STATUS_COLORS[effectiveStatus]?.progress || 'bg-[var(--admin-accent)]'}`}
              />
            )}
          </div>

          {happyPath.map((step, idx) => {
            const isActive = effectiveStatus === step && !isFailed;
            const isCompleted = currentIdx >= idx && !isFailed;
            const colors = STATUS_COLORS[step] || {};

            return (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-16 sm:w-20 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => updateOrderStatus(orderTargetId, step)}
                  className="relative group focus:outline-none cursor-pointer"
                >
                  {/* Pulse Effect for Active Step */}
                  {isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-full z-0 ${colors.pulse || 'bg-[var(--admin-accent)]'}`}
                    />
                  )}
                  {/* The Node */}
                  <div
                    className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2 ${
                      isActive
                        ? `${colors.activeBg || 'bg-[var(--admin-accent)]'} ${colors.activeBorder || 'border-[var(--admin-accent)]'} ${colors.activeText || 'text-white'}`
                        : isCompleted
                          ? `bg-[var(--admin-surface)] ${colors.completedBorder || 'border-[var(--admin-accent)]'} ${colors.completedText || 'text-[var(--admin-accent)]'}`
                          : 'bg-[var(--admin-surface)] border-[var(--admin-border-strong)] text-[var(--admin-text-tertiary)] group-hover:border-[var(--admin-border-strong)]'
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <span className="material-symbols-outlined text-[16px] sm:text-[20px] font-bold">
                        check
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px] sm:text-[18px]">
                        {statusIcons[step]}
                      </span>
                    )}
                  </div>
                </button>
                <div className="text-center mt-1">
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block transition-colors ${
                      isActive
                        ? colors.completedText || 'text-[var(--admin-text-primary)]'
                        : isCompleted
                          ? colors.completedText || 'text-[var(--admin-text-secondary)]'
                          : 'text-[var(--admin-text-tertiary)]'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isFailed && (
        <div className="mx-5 mb-4 p-2.5 rounded-[4px] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[12px] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">cancel</span>
          <span>This order is cancelled.</span>
        </div>
      )}
    </div>
  );
}

export { allStatuses, statusIcons };
