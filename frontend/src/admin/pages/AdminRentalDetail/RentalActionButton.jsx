import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';
import { m as motion, AnimatePresence } from 'framer-motion';

export function RentalActionButton({ rental, fetchRentalDetail, nextAction }) {
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!nextAction) return null;
  const { label, action } = nextAction;

  const handleAction = async () => {
    if (action === 'return') {
      setShowInspectionModal(true);
      return;
    }

    if (action === 'refund_deposit') {
      // The button is disabled because refund_deposit is handled by the Financials component,
      // but we can provide a nice redirect to scroll to it, or we could open the modal here.
      // We will let the Financials component handle the actual button.
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
      toast.success(`Rental status updated to ${targetStatus}`);
      fetchRentalDetail();
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
      fetchRentalDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark return');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (action === 'refund_deposit' || action === 'complete') {
    // If we are waiting for refund to process or we just need to complete
    return (
      <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden relative border-l-4 border-l-emerald-500 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              Next Required Action
            </h3>
            <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1">
              {action === 'refund_deposit'
                ? 'Please resolve the security deposit in the Financials section above to complete this rental.'
                : 'All requirements met. You can now complete this rental.'}
            </p>
          </div>
          {action === 'complete' && (
            <button
              onClick={handleAction}
              disabled={isSubmitting}
              className="admin-btn h-11 px-5 !rounded-[4px] font-bold text-[13px] bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Completing...' : label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden relative border-l-4 border-l-[var(--admin-accent)]">
        <div className="px-5 py-6">
          <button
            onClick={handleAction}
            disabled={isSubmitting}
            className="w-full h-11 rounded-[4px] font-bold text-[13px] flex items-center justify-center gap-2 transition-all bg-[var(--admin-accent)] border border-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
            )}
            {label}
          </button>
          <p className="text-[11px] text-center text-[var(--admin-text-secondary)] mt-3 font-medium uppercase tracking-wider">
            Next Valid Workflow Step
          </p>
        </div>
      </div>

      {showInspectionModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans pointer-events-none"
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSubmitting && setShowInspectionModal(false)}
                className="fixed inset-0 bg-black/40 dark:bg-black/60 cursor-pointer pointer-events-auto"
                style={{
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              />
              {/* Modal Card / Mobile App Drawer */}
              <motion.div
                initial={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: isMobile ? '100%' : 4, scale: isMobile ? 1 : 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`admin-section-root ${typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')) ? 'dark' : ''} pointer-events-auto relative bg-white dark:bg-[#1f1e1b] rounded-t-[20px] sm:rounded-[4px] shadow-2xl w-full sm:max-w-md overflow-hidden z-10 border-t sm:border border-[#e8e4d9] dark:border-white/10 font-sans max-h-[88vh] sm:max-h-none flex flex-col`}
                style={{
                  backgroundColor: 'var(--admin-surface, #ffffff)',
                  borderColor: 'var(--admin-border, #e8e4d9)',
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile Drawer Pull Indicator */}
                <div className="pt-2.5 pb-1 sm:hidden flex justify-center w-full bg-[#f2efe5] dark:bg-[#2a2823] cursor-grab active:cursor-grabbing">
                  <div className="w-10 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                </div>

                <div
                  className="px-5 py-3.5 sm:py-4 border-b border-[#e8e4d9] dark:border-white/10 flex items-center justify-between bg-[#f2efe5] dark:bg-[#2a2823] shrink-0"
                  style={{
                    backgroundColor: 'var(--admin-surface-muted, #f2efe5)',
                    borderColor: 'var(--admin-border-subtle, #e8e4d9)',
                  }}
                >
                  <h3
                    className="text-[15px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 font-sans tracking-normal"
                    style={{
                      fontFamily:
                        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
                      assignment_turned_in
                    </span>
                    Mark Return & Inspect
                  </h3>
                  <button
                    onClick={() => setShowInspectionModal(false)}
                    className="w-7 h-7 rounded-[4px] bg-white dark:bg-[#26241f] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[#f2efe5] dark:hover:bg-[#302d27] transition-colors shadow-2xs border border-[#e8e4d9] dark:border-white/10 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--admin-surface, #ffffff)',
                      borderColor: 'var(--admin-border, #e8e4d9)',
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <form
                  onSubmit={submitReturn}
                  className="p-5 font-sans overflow-y-auto custom-scrollbar flex-1 pb-8 sm:pb-5"
                >
                  <div className="mb-5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">
                      Inspection Note (Required)
                    </label>
                    <textarea
                      required
                      placeholder="e.g. Item returned in good condition."
                      value={inspectionNote}
                      onChange={(e) => setInspectionNote(e.target.value)}
                      className="w-full h-28 p-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] outline-none transition-all text-[13px] custom-scrollbar resize-none"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInspectionModal(false)}
                      className="flex-1 h-10 rounded-[4px] font-bold text-[13px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border-subtle)] border border-[var(--admin-border)] transition-colors cursor-pointer"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-10 rounded-[4px] font-bold text-[13px] bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="material-symbols-outlined animate-spin text-[16px]">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      )}
                      Confirm & Return
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
