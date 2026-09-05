import React, { useState } from 'react';
import toast from 'react-hot-toast';
import rentalService from '../../../services/api/rentalService';
import { m as motion, AnimatePresence } from 'framer-motion';

export function RentalPaymentModal({ rental, onClose, onSuccess }) {
  const effectivePaid = (rental.paymentHistory || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = rental.amountPaid ?? effectivePaid;
  const totalPrice = rental.totalAmount || 0;
  const balanceDue = Math.max(0, totalPrice - totalPaid);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    if (payAmount > balanceDue) {
      toast.error(`Cannot overpay. Balance due is ${formatCurrency(balanceDue)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await rentalService.adminRecordPayment(rental._id, {
        amount: payAmount,
        paymentMethod,
        note,
      });
      toast.success('Manual payment recorded successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record manual payment');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSubmitting ? onClose : undefined}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-7 z-10 border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div className="min-w-0 pr-3">
              <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-widest block mb-1 truncate">
                {rental.productTitle || 'RENTAL ORDER'}
              </span>
              <h3 className="text-[20px] font-bold text-gray-900 leading-tight">
                Record Manual Payment
              </h3>
            </div>
            <button
              onClick={!isSubmitting ? onClose : undefined}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Price Summary Box */}
            <div className="bg-[#f7f5f0] rounded-xl p-4 border border-[#eae5dc] space-y-2">
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-gray-700 font-medium">Total Price</span>
                <span className="font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-gray-700 font-medium">Total Paid</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-[14.5px] pt-2.5 mt-1 border-t border-[#dfd8cc]">
                <span className="font-bold text-gray-900">Balance Due</span>
                <span className="font-bold text-[#c55d38] text-[15.5px]">
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            {/* Amount Received */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-bold text-gray-800 block">
                Amount Received (₹) *
              </label>
              <input
                type="number"
                min="1"
                max={balanceDue}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                disabled={isSubmitting}
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:border-[#b8a48f] focus:ring-2 focus:ring-[#b8a48f]/20 outline-none text-[15px] font-medium transition-all"
              />
            </div>

            {/* Payment Method Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-bold text-gray-800 block">
                Payment Method *
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-11 px-3.5 pr-10 rounded-lg border border-gray-300 focus:border-[#b8a48f] focus:ring-2 focus:ring-[#b8a48f]/20 outline-none text-[14px] bg-white appearance-none cursor-pointer font-medium"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other Manual Method</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-400 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Note / Reference */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-bold text-gray-800 block">
                Note / Reference
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Handed over at venue / UPI Ref #123"
                disabled={isSubmitting}
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 focus:border-[#b8a48f] focus:ring-2 focus:ring-[#b8a48f]/20 outline-none text-[14px] transition-all"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || balanceDue <= 0}
                className="w-full h-12 rounded-xl bg-[#b8a48f] hover:bg-[#a5917c] text-white font-bold text-[14.5px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
                    <span>Recording Payment...</span>
                  </>
                ) : (
                  <span>Record Payment</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
