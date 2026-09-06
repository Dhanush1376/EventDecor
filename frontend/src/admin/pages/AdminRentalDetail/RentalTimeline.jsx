import React, { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';

const allStatuses = ['pending', 'confirmed', 'active_rental', 'returned', 'completed'];

const statusIcons = {
  pending: 'schedule',
  confirmed: 'thumb_up',
  active_rental: 'local_shipping',
  late_return: 'warning',
  return_requested: 'assignment_return',
  returned: 'keyboard_return',
  completed: 'check_circle',
  cancelled: 'cancel',
};

const STATUS_COLORS = {
  pending: {
    activeBg: 'bg-amber-500',
    activeBorder: 'border-amber-500',
    activeText: 'text-white',
    completedBorder: 'border-amber-500',
    completedText: 'text-amber-600',
    pulse: 'bg-amber-500',
    progress: 'bg-amber-500',
  },
  confirmed: {
    activeBg: 'bg-blue-500',
    activeBorder: 'border-blue-500',
    activeText: 'text-white',
    completedBorder: 'border-blue-500',
    completedText: 'text-blue-600',
    pulse: 'bg-blue-500',
    progress: 'bg-blue-500',
  },
  active_rental: {
    activeBg: 'bg-indigo-500',
    activeBorder: 'border-indigo-500',
    activeText: 'text-white',
    completedBorder: 'border-indigo-500',
    completedText: 'text-indigo-600',
    pulse: 'bg-indigo-500',
    progress: 'bg-indigo-500',
  },
  returned: {
    activeBg: 'bg-purple-500',
    activeBorder: 'border-purple-500',
    activeText: 'text-white',
    completedBorder: 'border-purple-500',
    completedText: 'text-purple-600',
    pulse: 'bg-purple-500',
    progress: 'bg-purple-500',
  },
  completed: {
    activeBg: 'bg-emerald-500',
    activeBorder: 'border-emerald-500',
    activeText: 'text-white',
    completedBorder: 'border-emerald-500',
    completedText: 'text-emerald-600',
    pulse: 'bg-emerald-500',
    progress: 'bg-emerald-500',
  },
};

const STATUS_STYLES = {
  pending: {
    bg: 'bg-amber-50/90',
    border: 'border-amber-200/80',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    iconColor: 'text-amber-600',
  },
  confirmed: {
    bg: 'bg-blue-50/90',
    border: 'border-blue-200/80',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-600',
  },
  active_rental: {
    bg: 'bg-indigo-50/90',
    border: 'border-indigo-200/80',
    text: 'text-indigo-800',
    dot: 'bg-indigo-500',
    iconColor: 'text-indigo-600',
  },
  returned: {
    bg: 'bg-purple-50/90',
    border: 'border-purple-200/80',
    text: 'text-purple-800',
    dot: 'bg-purple-500',
    iconColor: 'text-purple-600',
  },
  completed: {
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200/80',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
  },
  late_return: {
    bg: 'bg-rose-50/90',
    border: 'border-rose-200/80',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
    iconColor: 'text-rose-600',
  },
  return_requested: {
    bg: 'bg-purple-50/90',
    border: 'border-purple-200/80',
    text: 'text-purple-800',
    dot: 'bg-purple-500',
    iconColor: 'text-purple-600',
  },
  cancelled: {
    bg: 'bg-red-50/90',
    border: 'border-red-200/80',
    text: 'text-red-800',
    dot: 'bg-red-500',
    iconColor: 'text-red-600',
  },
};

const nextStepMap = {
  confirm: 'confirmed',
  activate: 'active_rental',
  return: 'returned',
  complete: 'completed',
};

export function RentalTimeline({ rental, fetchRentalDetail, nextAction }) {
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFailed = ['cancelled'].includes(rental.status);

  // Normalize current status to map to timeline
  let effectiveStatus = rental.status;
  if (['late_return', 'return_requested'].includes(rental.status)) {
    effectiveStatus = 'active_rental'; // Map to active rental on timeline visually
  }

  const currentIdx = allStatuses.indexOf(effectiveStatus);
  const formatStatus = (s) => (s || '').replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const nextStepKey = nextAction ? nextStepMap[nextAction.action] : null;

  const handleAction = async () => {
    if (!nextAction) return;
    const { action } = nextAction;

    if (action === 'return') {
      setShowInspectionModal(true);
      return;
    }

    if (action === 'refund_deposit') {
      const finEl = document.getElementById('rental-financials');
      if (finEl) finEl.scrollIntoView({ behavior: 'smooth' });
      toast('Please resolve the security deposit in the Financial Settlement section.', {
        icon: <span className="material-symbols-outlined text-[18px] text-blue-500">info</span>,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let targetStatus;
      switch (action) {
        case 'confirm':
          targetStatus = 'confirmed';
          break;
        case 'activate':
          targetStatus = 'active_rental';
          break;
        case 'complete':
          targetStatus = 'completed';
          break;
        default:
          return;
      }

      await rentalService.adminUpdateStatus(rental._id, targetStatus);
      toast.success(`Rental status updated to ${formatStatus(targetStatus)}`);
      if (fetchRentalDetail) fetchRentalDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await rentalService.adminUpdateStatus(rental._id, 'returned', inspectionNote);
      toast.success('Rental marked as returned with inspection note');
      setShowInspectionModal(false);
      if (fetchRentalDetail) fetchRentalDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
        {/* Card Header */}
        <div className="px-3.5 sm:px-5 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)] shrink-0">
                timeline
              </span>
              <h3 className="text-[13px] sm:text-[13.5px] font-bold text-gray-900 tracking-tight truncate">
                Lifecycle Progression
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Redesigned Current Status Indicator */}
              {(() => {
                const statusStyle = (STATUS_STYLES && STATUS_STYLES[rental.status]) ||
                  (STATUS_STYLES && STATUS_STYLES[effectiveStatus]) || {
                    bg: 'bg-indigo-50/90',
                    border: 'border-indigo-200/80',
                    text: 'text-indigo-800',
                    dot: 'bg-indigo-500',
                    iconColor: 'text-indigo-600',
                  };

                return (
                  <div
                    className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-[9.5px] sm:text-[10.5px] font-bold tracking-wider uppercase flex items-center gap-1.5 border shadow-xs transition-all ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${!isFailed ? 'animate-pulse' : ''}`}
                    />
                    <span
                      className={`material-symbols-outlined text-[13px] sm:text-[14px] ${statusStyle.iconColor}`}
                    >
                      {statusIcons[rental.status] || 'info'}
                    </span>
                    <span className="whitespace-nowrap">{formatStatus(rental.status)}</span>
                  </div>
                );
              })()}

              {/* Desktop/Tablet Primary Workflow Action Button */}
              {nextAction && (
                <button
                  onClick={handleAction}
                  disabled={isSubmitting}
                  className="hidden sm:flex group h-8 px-3.5 rounded-lg font-bold text-[11.5px] items-center gap-1.5 bg-gray-900 hover:bg-black text-white shadow-sm hover:shadow-md transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer border border-gray-800 shrink-0"
                  title={`Click to advance to: ${nextAction.label}`}
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-[14px]">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[15px] text-emerald-400 group-hover:scale-110 transition-transform">
                      play_circle
                    </span>
                  )}
                  <span>{nextAction.label}</span>
                  <span className="material-symbols-outlined text-[13px] text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Primary Action Button - Clean Full-Width Touch CTA */}
          {nextAction && (
            <div className="mt-2.5 sm:hidden">
              <button
                onClick={handleAction}
                disabled={isSubmitting}
                className="w-full h-9 px-4 rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 bg-gray-900 active:bg-black text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border border-gray-800"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-[15px]">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">
                    play_circle
                  </span>
                )}
                <span>{nextAction.label}</span>
                <span className="material-symbols-outlined text-[15px] text-gray-400">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Stepper Track: Continuous line behind circles with proportional spacing */}
        <div className="px-3 sm:px-6 py-4 sm:py-5">
          <div className="relative w-full flex items-start justify-between">
            {/* Continuous Line passing directly behind circle centers */}
            <div className="absolute left-[16px] right-[16px] sm:left-[18px] sm:right-[18px] top-[16px] sm:top-[18px] -translate-y-1/2 h-[2px] bg-[var(--admin-border)] z-0">
              {!isFailed && currentIdx >= 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentIdx / (allStatuses.length - 1)) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full ${STATUS_COLORS[effectiveStatus]?.progress || 'bg-[var(--admin-accent)]'}`}
                />
              )}
            </div>

            {allStatuses.map((step, idx) => {
              const isActive = effectiveStatus === step;
              const isCompleted = currentIdx >= idx && !isFailed;
              const isNextStep = step === nextStepKey;
              const colors = STATUS_COLORS[step] || {};

              return (
                <div key={step} className="relative z-10 flex flex-col items-center flex-1 min-w-0">
                  {/* Node Container (Center aligned) */}
                  <div className="h-8 sm:h-9 flex items-center justify-center relative">
                    {/* Pulse Effect for Active Step */}
                    {isActive && !isFailed && (
                      <motion.div
                        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`absolute inset-0 rounded-full z-0 ${colors.pulse || 'bg-[var(--admin-accent)]'}`}
                      />
                    )}

                    {/* Glowing Ring for Next Clickable Step */}
                    {isNextStep && !isSubmitting && (
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute -inset-1 rounded-full bg-[var(--admin-accent)] z-0"
                      />
                    )}

                    {/* Node Element with solid bg to cleanly mask line behind it */}
                    {isNextStep ? (
                      <button
                        onClick={handleAction}
                        disabled={isSubmitting}
                        className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm border-2 border-[var(--admin-accent)] bg-white text-[var(--admin-accent)] hover:bg-[var(--admin-accent)] hover:text-white cursor-pointer hover:scale-105 active:scale-95"
                        title={`Click to ${nextAction.label}`}
                      >
                        <span className="material-symbols-outlined text-[15px] sm:text-[17px]">
                          {statusIcons[step]}
                        </span>
                      </button>
                    ) : (
                      <div
                        className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2 ${
                          isActive && !isFailed
                            ? `${colors.activeBg || 'bg-[var(--admin-accent)]'} ${colors.activeBorder || 'border-[var(--admin-accent)]'} ${colors.activeText || 'text-white'}`
                            : isCompleted
                              ? `bg-white ${colors.completedBorder || 'border-[var(--admin-accent)]'} ${colors.completedText || 'text-[var(--admin-accent)]'}`
                              : 'bg-white border-[var(--admin-border-strong)] text-[var(--admin-text-tertiary)]'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined ${isActive ? 'text-[15px] sm:text-[17px]' : 'text-[13px] sm:text-[15px]'}`}
                        >
                          {statusIcons[step]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Label below with clean mobile typography */}
                  <div className="mt-1.5 flex flex-col items-center w-full px-0.5">
                    <span
                      className={`text-[8px] sm:text-[9.5px] font-bold uppercase tracking-wider text-center leading-tight ${
                        isActive && !isFailed
                          ? 'text-[var(--admin-text-primary)] font-extrabold'
                          : isNextStep
                            ? 'text-[var(--admin-accent)] font-bold'
                            : isCompleted
                              ? 'text-[var(--admin-text-secondary)]'
                              : 'text-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      {formatStatus(step)}
                    </span>

                    {isNextStep && (
                      <span className="text-[7.5px] sm:text-[8px] text-[var(--admin-accent)] font-semibold leading-none mt-0.5 animate-pulse hidden sm:inline-block">
                        Click to advance
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Return & Inspection Modal with reduced border radius */}
      <AnimatePresence>
        {showInspectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-[var(--admin-border)]"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                <h3 className="text-[15px] font-bold text-blue-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-blue-600">
                    assignment_turned_in
                  </span>
                  Mark Return & Inspect
                </h3>
                <button
                  onClick={() => setShowInspectionModal(false)}
                  className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shadow-sm border border-gray-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <form onSubmit={submitReturn} className="p-5">
                <div className="mb-5">
                  <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Inspection Note (Required)
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Item returned in good condition."
                    value={inspectionNote}
                    onChange={(e) => setInspectionNote(e.target.value)}
                    className="w-full h-28 p-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-[13px] custom-scrollbar resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInspectionModal(false)}
                    className="flex-1 h-10 rounded-lg font-bold text-[13px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-lg font-bold text-[13px] bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">
                        progress_activity
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    )}
                    Confirm Return
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
