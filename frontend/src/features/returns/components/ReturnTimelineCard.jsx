import React from 'react';
import { m as motion } from 'framer-motion';
import {
  RETURN_HAPPY_PATH,
  STEP_ICONS,
  STEP_COLORS,
  getReturnTimelineCardStyle,
} from '../utils/returnDomainUtils';

export function ReturnTimelineCard({
  currentStepName,
  isFailed = false,
  currentIdx = 0,
  status = 'submitted',
  happyPath = RETURN_HAPPY_PATH,
  onTransitionStatus,
  title = 'Lifecycle Progression',
  description = "Track and override the return's current operational stage.",
  statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'return_picked_up', label: 'Item Picked Up' },
    { value: 'return_received', label: 'Returned / Received' },
    { value: 'inspection_completed', label: 'QC Passed' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ],
  children,
}) {
  return (
    <div
      className={`rounded-[6px] overflow-hidden transition-all border ${getReturnTimelineCardStyle(
        currentStepName,
        isFailed,
      )}`}
    >
      <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium hidden sm:block mt-0.5">
              {description}
            </p>
          )}
        </div>
        {/* Status Dropdown to override return status */}
        {onTransitionStatus && (
          <div className="relative w-[140px] sm:w-[165px] h-8 shrink-0">
            <select
              value={status}
              onChange={(e) => onTransitionStatus(e.target.value)}
              style={{ backgroundImage: 'none' }}
              className="admin-no-arrow w-full h-8 !min-h-[32px] !max-h-[32px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[4px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors truncate"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-stone-500">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </div>
          </div>
        )}
      </div>

      {/* Horizontal Connected Stepper */}
      <div className="px-3 sm:px-5 py-8 overflow-hidden">
        <div className="flex items-center justify-between relative w-full max-w-full">
          {/* Background connecting bar */}
          <div className="absolute left-[10%] right-[10%] top-[20px] h-[2px] bg-[var(--admin-border)] z-0">
            {!isFailed && currentIdx >= 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(currentIdx / (happyPath.length - 1)) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`absolute left-0 top-0 bottom-0 ${STEP_COLORS[currentStepName]?.progress || 'bg-[var(--admin-accent)]'}`}
              />
            )}
          </div>

          {happyPath.map((step, idx) => {
            const isActive = currentStepName === step;
            const isCompleted = currentIdx >= idx && !isFailed;
            const colors = STEP_COLORS[step] || {};

            return (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-16 sm:w-24 shrink-0 text-center"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    isActive
                      ? `${colors.activeBg || 'bg-amber-500'} ${colors.activeText || 'text-white'} shadow-md scale-110`
                      : isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] leading-none">
                    {STEP_ICONS[step] || 'circle'}
                  </span>
                </div>
                <span
                  className={`text-[10.5px] sm:text-[11.5px] font-bold leading-tight ${
                    isActive
                      ? 'text-[var(--admin-text-primary)]'
                      : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
