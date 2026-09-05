import React, { useState } from 'react';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';
import { m as motion, AnimatePresence } from 'framer-motion';

export function RentalActionButton({ rental, fetchRentalDetail, nextAction }) {
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionNote, setInspectionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden relative border-l-4 border-l-emerald-500 p-5">
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
              className="admin-btn h-12 px-6 rounded-xl font-bold text-[14px] bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
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
      <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden relative border-l-4 border-l-[var(--admin-accent)]">
        <div className="px-5 py-6">
          <button
            onClick={handleAction}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all bg-[var(--admin-accent)] border border-[var(--admin-accent)] text-white hover:opacity-90 shadow-sm"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
            )}
            {label}
          </button>
          <p className="text-[11px] text-center text-[var(--admin-text-secondary)] mt-3 font-medium uppercase tracking-wider">
            Next Valid Workflow Step
          </p>
        </div>
      </div>

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
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                <h3 className="text-[16px] font-bold text-blue-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-blue-600">
                    assignment_turned_in
                  </span>
                  Mark Return & Inspect
                </h3>
                <button
                  onClick={() => setShowInspectionModal(false)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={submitReturn} className="p-6">
                <div className="mb-6">
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Inspection Note (Required)
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Item returned in good condition."
                    value={inspectionNote}
                    onChange={(e) => setInspectionNote(e.target.value)}
                    className="w-full h-32 p-4 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-[14px] custom-scrollbar resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInspectionModal(false)}
                    className="flex-1 h-11 rounded-xl font-bold text-[14px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl font-bold text-[14px] bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
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
