import React from 'react';
import { m as motion } from 'framer-motion';

const allStatuses = [
  'Pending',
  'Confirmed',
  'Processing',
  'Delivered',
  'Settled',
  'Cancelled',
  'Returned',
  'Refunded',
];

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Processing: 'inventory_2',
  Delivered: 'check_circle',
  Settled: 'payments',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
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
};

export function OrderStatusTimeline({ order, updateOrderStatus }) {
  const isFailed = ['Cancelled', 'Returned', 'Refunded'].includes(order.status);
  const happyPath = ['Pending', 'Confirmed', 'Processing', 'Delivered'];
  const currentIdx = happyPath.indexOf(order.status);

  return (
    <div className="bg-white rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[14px] font-bold text-gray-900 tracking-tight">
            Lifecycle Progression
          </h3>
          <p className="text-[12px] text-gray-500 font-medium hidden sm:block mt-0.5">
            Track and override the order's current stage.
          </p>
        </div>
        {/* Status Dropdown to Update Order Status */}
        <div className="relative w-[140px] sm:w-[155px] h-8 shrink-0">
          <select
            value={order.status}
            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
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
                className={`absolute left-0 top-0 bottom-0 ${STATUS_COLORS[order.status]?.progress || 'bg-[var(--admin-accent)]'}`}
              />
            )}
          </div>

          {happyPath.map((step, idx) => {
            const isActive = order.status === step;
            const isCompleted = currentIdx >= idx && !isFailed;
            const colors = STATUS_COLORS[step] || {};

            return (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-16 sm:w-20 shrink-0"
              >
                <button
                  onClick={() => updateOrderStatus(order.id, step)}
                  className="relative group focus:outline-none"
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
                          ? `bg-white ${colors.completedBorder || 'border-[var(--admin-accent)]'} ${colors.completedText || 'text-[var(--admin-accent)]'}`
                          : 'bg-white border-[var(--admin-border-strong)] text-[var(--admin-text-tertiary)] group-hover:border-[var(--admin-border-strong)]'
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

      <div className="bg-gray-50 border-t border-[var(--admin-border-subtle)] px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Set Status
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {['Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'].map((s) => {
            const isSelected = order.status === s;
            return (
              <button
                key={s}
                onClick={() => updateOrderStatus(order.id, s)}
                className={`flex-auto sm:flex-none justify-center px-2 sm:px-3 py-1.5 rounded-[4px] text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all border whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-sm'
                    : 'bg-white text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-bg-subtle)] shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[12px] sm:text-[13px]">
                  {statusIcons[s]}
                </span>
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { allStatuses, statusIcons };
