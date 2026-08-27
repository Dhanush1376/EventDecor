import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, CreditCard, AlertCircle } from 'lucide-react';
import { returnService } from '../../../services/api/returnService';
import toast from 'react-hot-toast';

export default function RefundDestinationModal({ isOpen, onClose, returnRequest, onComplete }) {
  const [selectedMethod, setSelectedMethod] = useState('wallet');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !returnRequest) return null;

  const refundAmount = returnRequest.refundBreakdown?.grandTotal || 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create endpoint to update refund destination and trigger refund
      const res = await returnService.updateRefundMethod(returnRequest._id, {
        refundMethod: selectedMethod,
      });
      if (res.data?.success) {
        toast.success('Refund processed successfully!');
        onComplete(res.data.data); // Return updated return request
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface-bright rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="p-5 border-b border-outline-variant/30 flex justify-between items-center">
            <h3 className="font-display font-medium text-lg text-on-surface">Refund Destination</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container-low text-secondary transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-secondary mb-1">Total Refund Amount</p>
              <div className="text-3xl font-display text-primary">
                ₹{refundAmount.toLocaleString()}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface mb-2">
                Where should we send it?
              </p>

              <label
                className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMethod === 'wallet'
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant/30 hover:border-outline-variant'
                }`}
              >
                <div className="pt-1">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="wallet"
                    checked={selectedMethod === 'wallet'}
                    onChange={() => setSelectedMethod('wallet')}
                    className="w-4 h-4 text-primary focus:ring-primary border-outline"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-2">
                      <Wallet size={16} /> Wallet Credit
                    </span>
                    <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-bold uppercase">
                      Instant
                    </span>
                  </div>
                  <p className="text-xs text-secondary">
                    Money added to your EventDecor wallet instantly. Use it for your next purchase.
                  </p>
                </div>
              </label>

              <label
                className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMethod === 'original'
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant/30 hover:border-outline-variant'
                }`}
              >
                <div className="pt-1">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="original"
                    checked={selectedMethod === 'original'}
                    onChange={() => setSelectedMethod('original')}
                    className="w-4 h-4 text-primary focus:ring-primary border-outline"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-on-surface flex items-center gap-2">
                      <CreditCard size={16} /> Original Payment
                    </span>
                  </div>
                  <p className="text-xs text-secondary">
                    Refunded to your original Razorpay method. Takes 3-5 business days to reflect.
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-amber-50 rounded-lg p-3 flex gap-3 text-amber-900 text-xs">
              <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <p>
                Once you confirm, the refund will be initiated immediately. This action cannot be
                reversed.
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-outline-variant/30 flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg font-bold uppercase tracking-widest text-xs border border-outline-variant/50 hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg font-bold uppercase tracking-widest text-xs bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Refund'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
