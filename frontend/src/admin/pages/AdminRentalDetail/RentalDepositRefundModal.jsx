import React, { useState } from 'react';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';
import { m as motion, AnimatePresence } from 'framer-motion';

export function RentalDepositRefundModal({ rental, onClose, onSuccess }) {
  const depositHeld = rental.securityDeposit || 0;

  const [deductionAmount, setDeductionAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [method, setMethod] = useState(rental.razorpayPaymentId ? 'razorpay' : 'cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refundAmount = Math.max(0, depositHeld - Number(deductionAmount));
  const hasRazorpay = !!rental.razorpayPaymentId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (deductionAmount > depositHeld) {
      toast.error('Deduction cannot exceed deposit held');
      return;
    }
    if (deductionAmount > 0 && !deductionReason.trim()) {
      toast.error('Reason required for deduction');
      return;
    }

    setIsSubmitting(true);
    try {
      await rentalService.adminReleaseDeposit(rental._id, {
        deductionAmount: Number(deductionAmount),
        deductionReason,
        method,
      });
      toast.success('Deposit resolution initiated');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resolve deposit');
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <AnimatePresence>
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
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
            <h3 className="text-[16px] font-bold text-indigo-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-indigo-600">
                currency_rupee
              </span>
              Resolve Security Deposit
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <div className="flex justify-between mb-2">
                <span className="text-[13px] text-gray-500 font-medium">Customer:</span>
                <span className="text-[13px] font-bold text-gray-900">
                  {rental.shippingAddress?.name}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-[14px] font-bold text-gray-900 uppercase">Deposit Held:</span>
                <span className="text-[15px] font-black text-indigo-600">
                  {formatCurrency(depositHeld)}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={depositHeld}
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-[15px]"
                />
              </div>

              {Number(deductionAmount) > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="overflow-hidden"
                >
                  <label className="block text-[13px] font-bold text-red-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Deduction Reason
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Damage to item"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all text-[14px]"
                  />
                </motion.div>
              )}
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100 flex justify-between items-center">
              <span className="text-[14px] font-bold text-indigo-900 uppercase">
                Final Refund Amount:
              </span>
              <span className="text-[18px] font-black text-indigo-600">
                {formatCurrency(refundAmount)}
              </span>
            </div>

            {refundAmount > 0 && (
              <div className="mb-6">
                <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Refund Method
                </label>
                <div className="flex flex-col gap-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${method === 'razorpay' ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:border-gray-300'} ${!hasRazorpay ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="razorpay"
                      checked={method === 'razorpay'}
                      onChange={() => setMethod('razorpay')}
                      disabled={!hasRazorpay}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-gray-900">
                        Razorpay (Original Source)
                      </span>
                      {!hasRazorpay && (
                        <span className="text-[11px] text-gray-500">
                          Not available for COD orders
                        </span>
                      )}
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${method === 'cash' ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="cash"
                      checked={method === 'cash'}
                      onChange={() => setMethod('cash')}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-gray-900">
                        Cash / Manual Transfer
                      </span>
                      <span className="text-[11px] text-gray-500">Mark as refunded offline</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl font-bold text-[14px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl font-bold text-[14px] bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                )}
                {refundAmount > 0 ? `Refund ${formatCurrency(refundAmount)}` : 'Forfeit Deposit'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
