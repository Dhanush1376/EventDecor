import { AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useCustomerContact } from '../../hooks/useCustomerContact';
import { useScrollLock } from '../../hooks/useScrollLock';
import { fadeUp } from '../../animations/variants';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function PhoneCollectionModal({ isOpen, onClose, onSuccess }) {
  const [phone, setPhone] = useState('');
  const { updatePhone, isLoading } = useCustomerContact();
  const [error, setError] = useState('');

  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.replace(/[^\d]/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const success = await updatePhone(phone);
    if (success) {
      onSuccess?.();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          exit="exit"
          className="bg-[var(--surface)] w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative"
        >
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Contact Details Required
            </h2>
            <p className="text-[var(--text-secondary)] mt-2">
              Please provide your mobile number to proceed with this transaction. We use this for
              critical updates regarding your order.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                  placeholder="98765 43210"
                  className="w-full pl-12 pr-4 py-3 bg-[var(--background)] border border-[var(--border-strong)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                  disabled={isLoading}
                />
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 flex items-start gap-2 shadow-sm mt-3"
                  >
                    <AlertCircle className="text-[16px] mt-0.5" strokeWidth={1.5} />
                    <span className="flex-1 leading-snug">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-[var(--surface)] text-[var(--text-primary)] font-medium rounded-xl border border-[var(--border-strong)] hover:bg-[var(--background)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-[var(--accent)] text-white font-medium rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
