import { AlertTriangle } from 'lucide-react';
export function QuotationCard({
  selectedBooking,
  handleApproveQuote,
  setPaymentAmount,
  setIsPaymentModalOpen,
}) {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs text-left font-body">
      <div className="pb-4 mb-4 border-b border-outline-variant/20 flex flex-col lg:flex-row justify-between lg:items-center gap-2">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">request_quote</span>
          Price Estimate
        </h2>
        <span
          className={`px-3 py-1.5 rounded-[32px] text-[8px] uppercase tracking-widest font-bold self-start lg:self-auto border shadow-sm ${
            selectedBooking.clientApproved
              ? 'bg-green-50/50 text-green-700 border-green-200'
              : 'bg-surface-container-lowest text-secondary border-outline-variant/40'
          }`}
        >
          {selectedBooking.clientApproved ? 'Approved by Client' : 'Awaiting Client Approval'}
        </span>
      </div>

      {(() => {
        const p = selectedBooking.pricing || {};
        const total = p.totalPrice || 0;
        const deposit = p.depositAmount || 0;
        const pending = p.pendingBalance || 0;
        const amountPaid = Math.max(0, total - pending);
        const depositPct = total > 0 ? Math.round((deposit / total) * 100) : 0;
        const transportCost = p.travelExpenseTotal || p.transportationCost || 0;

        return (
          <div className="space-y-3 text-[11px] text-on-surface">
            <div className="flex justify-between">
              <span className="text-secondary">Decor & Rentals</span>
              <span className="font-semibold">₹{(p.rentalFee || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Setup & Labor</span>
              <span className="font-semibold">
                ₹{(p.setupCharges || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Transportation & Delivery</span>
              <span className="font-semibold">₹{transportCost.toLocaleString('en-IN')}</span>
            </div>
            {selectedBooking.selectedAddons?.map((addon, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-secondary">+ {addon.name}</span>
                <span className="font-semibold">₹{(addon.price || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}

            <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-sm text-primary">
              <span>Total Price</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>

            <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-[11px]">
              <div className="flex flex-col">
                <span className="text-on-surface">Advance Deposit</span>
                <span className="text-[9px] text-secondary font-normal uppercase tracking-widest mt-0.5">
                  {depositPct}% to confirm schedules
                </span>
              </div>
              <span>₹{deposit.toLocaleString('en-IN')}</span>
            </div>

            {amountPaid > 0 && (
              <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-[11px]">
                <span className="text-on-surface">Amount Paid</span>
                <span className="text-green-600">₹{amountPaid.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-[11px] pb-3 border-b border-outline-variant/20">
              <div className="flex flex-col">
                <span className="text-on-surface">Remaining Balance</span>
                <span className="text-[9px] text-secondary font-normal uppercase tracking-widest mt-0.5">
                  Payment Status: {p.paymentStatus || 'unpaid'}
                </span>
              </div>
              <span className="text-sm text-primary">₹{pending.toLocaleString('en-IN')}</span>
            </div>

            {selectedBooking.status === 'quotation_sent' && !selectedBooking.clientApproved && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => handleApproveQuote(false)}
                  className="px-6 py-2.5 bg-surface text-secondary hover:text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  Request Revisions
                </button>
                <button
                  onClick={() => handleApproveQuote(true)}
                  className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center whitespace-nowrap cursor-pointer border-0"
                >
                  Approve Quotation
                </button>
              </div>
            )}

            {p.pendingBalance > 0 && (
              <div className="bg-amber-50/50 p-4 rounded-lg flex flex-row justify-between items-center gap-4 border border-amber-200/50 mt-4">
                <span className="text-[9px] uppercase tracking-widest text-amber-800 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="text-[14px]" strokeWidth={1.5} />
                  Payment Pending
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(
                      p.paymentStatus === 'unpaid' ? p.depositAmount : p.pendingBalance,
                    );
                    setIsPaymentModalOpen(true);
                  }}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 border-0 disabled:opacity-50 cursor-pointer"
                >
                  MAKE PAYMENT
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
