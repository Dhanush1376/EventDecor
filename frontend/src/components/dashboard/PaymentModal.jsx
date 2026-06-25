import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function PaymentModal({
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  paymentAmount,
  setPaymentAmount,
  paymentNote,
  setPaymentNote,
  handleProcessPayment,
}) {
  return (
    <AnimatePresence>
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPaymentModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface-bright rounded-lg border border-outline-variant/30 shadow-2xl p-6 md:p-8 max-w-md w-full relative z-10 space-y-6"
          >
            <div className="flex justify-between items-start border-b border-outline-variant/20 pb-3">
              <div className="space-y-0.5">
                <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold">
                  MILESTONE TRANSACTION
                </span>
                <h3 className="text-[11px] font-extrabold text-on-surface uppercase tracking-widest mt-1">
                  Lodge UPI/Credit Milestone Payment
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Payment Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="form-field"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="form-label">Payment Stage Description</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="form-field"
                  required
                />
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-1 text-[11px] leading-relaxed">
                <span className="font-display font-bold text-primary block">
                  💳 Gilded UPI gateway simulation:
                </span>
                <p className="text-secondary">
                  Clicking below will simulate a secure UPI transaction callback and log credit
                  milestones directly into your Siri Arts & Crafts workspace ledger.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-2.5 rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors shadow-md"
              >
                Confirm simulated deposit
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
