import React, { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';

const allStatuses = ['pending', 'confirmed', 'active_rental', 'returned', 'completed', 'cancelled'];

const happyPath = ['pending', 'confirmed', 'active_rental', 'returned', 'completed'];

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active_rental: 'Active',
  returned: 'Returned',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusIcons = {
  pending: 'schedule',
  confirmed: 'thumb_up',
  active_rental: 'local_shipping',
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
    activeBg: 'bg-[var(--admin-accent)]',
    activeBorder: 'border-[var(--admin-accent)]',
    activeText: 'text-white',
    completedBorder: 'border-[var(--admin-accent)]',
    completedText: 'text-[var(--admin-accent)]',
    pulse: 'bg-[var(--admin-accent)]',
    progress: 'bg-[var(--admin-accent)]',
  },
  active_rental: {
    activeBg: 'bg-[var(--admin-accent)]',
    activeBorder: 'border-[var(--admin-accent)]',
    activeText: 'text-white',
    completedBorder: 'border-[var(--admin-accent)]',
    completedText: 'text-[var(--admin-accent)]',
    pulse: 'bg-[var(--admin-accent)]',
    progress: 'bg-[var(--admin-accent)]',
  },
  returned: {
    activeBg: 'bg-stone-600',
    activeBorder: 'border-stone-600',
    activeText: 'text-white',
    completedBorder: 'border-stone-600',
    completedText: 'text-stone-600',
    pulse: 'bg-stone-600',
    progress: 'bg-stone-600',
  },
  completed: {
    activeBg: 'bg-emerald-600',
    activeBorder: 'border-emerald-600',
    activeText: 'text-white',
    completedBorder: 'border-emerald-600',
    completedText: 'text-emerald-600',
    pulse: 'bg-emerald-600',
    progress: 'bg-emerald-600',
  },
};

export function RentalTimeline({ rental, fetchRentalDetail, nextAction }) {
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFailed = rental.status === 'cancelled';
  const effectiveStatus = rental.status;
  const currentIdx = happyPath.indexOf(effectiveStatus);

  const handleUpdateStatus = async (targetStatus) => {
    setIsSubmitting(true);
    try {
      await rentalService.adminUpdateStatus(rental._id, targetStatus);
      toast.success(`Rental status updated to ${statusLabels[targetStatus] || targetStatus}`);
      if (fetchRentalDetail) fetchRentalDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'returned') {
      setShowInspectionModal(true);
    } else {
      handleUpdateStatus(newStatus);
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
    <div className="bg-white dark:bg-stone-900 rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
      {/* Card Header with Lifecycle Progression and Status Dropdown */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between bg-[var(--admin-bg-subtle)]/40 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
            timeline
          </span>
          <h3 className="text-[13.5px] font-bold text-gray-900 dark:text-stone-100 tracking-tight truncate">
            Rental Progression
          </h3>
        </div>

        {/* Status Dropdown to Update Rental Status */}
        <div className="relative w-[135px] sm:w-[150px] h-8 shrink-0">
          <select
            value={rental.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isSubmitting}
            style={{ backgroundImage: 'none' }}
            className="admin-no-arrow w-full h-8 !min-h-[32px] !max-h-[32px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[4px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-[var(--admin-accent)] transition-colors truncate disabled:opacity-50"
          >
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s] || s}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-stone-500">
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="px-3 sm:px-5 py-6 sm:py-7 overflow-hidden">
        <div className="flex items-center justify-between relative w-full max-w-full">
          {/* Thin Background Line */}
          <div className="absolute left-[10%] right-[10%] top-[18px] sm:top-[20px] h-[2px] bg-[var(--admin-border)] z-0">
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
            const isActive = effectiveStatus === step;
            const isCompleted = currentIdx >= idx && !isFailed;
            const colors = STATUS_COLORS[step] || {};

            return (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2 w-16 sm:w-20 shrink-0"
              >
                <button
                  onClick={() => handleStatusChange(step)}
                  disabled={isSubmitting}
                  className="relative group focus:outline-none cursor-pointer"
                  title={`Set status to ${statusLabels[step]}`}
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
                    className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xs border-2 ${
                      isActive
                        ? `${colors.activeBg || 'bg-[var(--admin-accent)]'} ${colors.activeBorder || 'border-[var(--admin-accent)]'} ${colors.activeText || 'text-white'}`
                        : isCompleted
                          ? `bg-white dark:bg-stone-800 ${colors.completedBorder || 'border-[var(--admin-accent)]'} ${colors.completedText || 'text-[var(--admin-accent)]'}`
                          : 'bg-white dark:bg-stone-800 border-[var(--admin-border-strong)] text-[var(--admin-text-tertiary)] group-hover:border-[var(--admin-border-strong)]'
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <span className="material-symbols-outlined text-[15px] sm:text-[17px] font-bold">
                        check
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                        {statusIcons[step]}
                      </span>
                    )}
                  </div>
                </button>
                <div className="text-center">
                  <span
                    className={`text-[10.5px] sm:text-[11px] font-medium block transition-colors ${
                      isActive
                        ? 'font-bold text-[var(--admin-text-primary)]'
                        : isCompleted
                          ? 'font-semibold text-[var(--admin-text-secondary)]'
                          : 'text-[var(--admin-text-tertiary)]'
                    }`}
                  >
                    {statusLabels[step]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspection Modal for Returns */}
      <AnimatePresence>
        {showInspectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--admin-surface)] rounded-[4px] shadow-xl border border-[var(--admin-border)] w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                    assignment_return
                  </span>
                  Return Inspection
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={submitReturn} className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">
                    Item Condition & Inspection Notes
                  </label>
                  <textarea
                    value={inspectionNote}
                    onChange={(e) => setInspectionNote(e.target.value)}
                    placeholder="E.g. Item returned in perfect condition, no scratches or damage observed."
                    rows={4}
                    className="w-full p-2.5 text-[12px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] transition-colors resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInspectionModal(false)}
                    className="admin-btn admin-btn-outline h-9 px-4 text-[12px] font-bold !rounded-[4px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="admin-btn admin-btn-primary h-9 px-4 text-[12px] font-bold !rounded-[4px] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Confirm Return'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { allStatuses, statusIcons };
