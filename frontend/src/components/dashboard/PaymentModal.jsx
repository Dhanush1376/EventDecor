import { X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useMobileDrawerEngine, DrawerDragHandle } from '../ui/drawer';

export function PaymentModal({
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  paymentAmount,
  setPaymentAmount,
  paymentNote,
  setPaymentNote,
  handleProcessPayment,
}) {
  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: isPaymentModalOpen,
    onClose: () => setIsPaymentModalOpen(false),
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPaymentModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto cursor-pointer"
          />
          <motion.div
            initial={{
              y: isMobile ? '100%' : 8,
              opacity: isMobile ? 1 : 0,
              scale: isMobile ? 1 : 0.98,
            }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{
              y: isMobile ? '100%' : 8,
              opacity: isMobile ? 1 : 0,
              scale: isMobile ? 1 : 0.98,
            }}
            transition={sheetTransition}
            {...dragProps}
            className="bg-surface-bright rounded-t-3xl sm:rounded-2xl border border-outline-variant/30 shadow-2xl p-6 lg:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8 w-full sm:max-w-md relative z-10 space-y-6 max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y pointer-events-auto"
          >
            {isMobile && <DrawerDragHandle onClick={() => setIsPaymentModalOpen(false)} />}
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
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90 cursor-pointer"
              >
                <X className="text-[18px]" strokeWidth={1.5} />
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
                  <CreditCard className="inline-block w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />
                  Secure Payment Gateway
                </span>
                <p className="text-secondary">
                  Clicking below will redirect you to our secure payment gateway to lodge the
                  milestone payment.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-2.5 rounded-full font-label text-[9px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors shadow-md cursor-pointer"
              >
                Proceed to Payment
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
