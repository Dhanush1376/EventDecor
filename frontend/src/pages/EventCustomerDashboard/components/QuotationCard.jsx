export function QuotationCard({
  selectedBooking,
  handleApproveQuote,
  setPaymentAmount,
  setIsPaymentModalOpen,
}) {
  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/40 p-6 space-y-6 shadow-xs text-[11px] text-left">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center border-b border-black/5 pb-4 gap-2">
        <h3 className="font-bold text-[18px] text-on-surface tracking-tight">
          Quotation Estimate Details
        </h3>
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

      <div className="space-y-4 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-secondary font-medium tracking-wide leading-snug">
            Event Decor & Rental:
          </span>
          <span className="text-on-surface font-semibold shrink-0">
            ₹{selectedBooking.pricing?.rentalFee?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-secondary font-medium tracking-wide leading-snug">
            Bespoke Setup Logistics Crew Labor:
          </span>
          <span className="text-on-surface font-semibold shrink-0">
            ₹{selectedBooking.pricing?.setupCharges?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-secondary font-medium tracking-wide leading-snug">
            Logistics Transportation Fleet Cost:
          </span>
          <span className="text-on-surface font-semibold shrink-0">
            ₹{selectedBooking.pricing?.transportationCost?.toLocaleString('en-IN')}
          </span>
        </div>
        {selectedBooking.selectedAddons?.map((addon, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span className="text-secondary font-medium tracking-wide leading-snug">
              + {addon.name}:
            </span>
            <span className="text-on-surface font-semibold shrink-0">
              ₹{addon.price?.toLocaleString('en-IN')}
            </span>
          </div>
        ))}

        <div className="border-t border-black/5 pt-5 flex justify-between items-end gap-3 mt-2">
          <span className="font-bold text-[12px] uppercase tracking-widest text-on-surface leading-snug">
            Total Estimate Contract Price:
          </span>
          <span className="font-bold text-[16px] text-on-surface italic shrink-0">
            ₹{selectedBooking.pricing?.totalPrice?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="border-t border-black/5 pt-5 flex justify-between items-end gap-3">
          <div className="space-y-1">
            <span className="font-bold text-[10px] uppercase tracking-widest text-on-surface block leading-snug">
              Milestone Deposit Required:
            </span>
            <span className="text-[9px] text-secondary font-medium block">
              25% to confirm schedules
            </span>
          </div>
          <span className="font-bold text-[13px] text-on-surface shrink-0">
            ₹{selectedBooking.pricing?.depositAmount?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="border-t border-black/5 pt-5 flex justify-between items-end gap-3">
          <div className="space-y-1">
            <span className="font-bold text-[10px] uppercase tracking-widest text-on-surface block leading-snug">
              Pending Balance Remaining:
            </span>
            <span className="text-[9px] text-secondary font-medium block capitalize">
              Payment Status: {selectedBooking.pricing?.paymentStatus}
            </span>
          </div>
          <span className="font-bold text-[16px] text-on-surface italic shrink-0">
            ₹{selectedBooking.pricing?.pendingBalance?.toLocaleString('en-IN')}
          </span>
        </div>

        {selectedBooking.status === 'quotation_sent' && !selectedBooking.clientApproved && (
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/5 mt-4">
            <button
              onClick={() => handleApproveQuote(false)}
              className="py-3 rounded-[32px] border border-outline-variant/40 text-secondary font-bold text-[9px] uppercase tracking-widest hover:bg-surface-container-lowest transition-colors cursor-pointer"
            >
              Request Revisions
            </button>
            <button
              onClick={() => handleApproveQuote(true)}
              className="bg-[#2A2927] text-white py-3 rounded-[32px] font-bold text-[9px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg cursor-pointer border-0"
            >
              Approve Quotation
            </button>
          </div>
        )}

        {selectedBooking.pricing?.pendingBalance > 0 && (
          <button
            type="button"
            onClick={() => {
              setPaymentAmount(
                selectedBooking.pricing.paymentStatus === 'unpaid'
                  ? selectedBooking.pricing.depositAmount
                  : selectedBooking.pricing.pendingBalance,
              );
              setIsPaymentModalOpen(true);
            }}
            className="w-full mt-6 bg-[#2A2927] hover:bg-black text-white py-3.5 rounded-[32px] font-bold text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            LODGE MILESTONE PAYMENT
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
          </button>
        )}
      </div>
    </div>
  );
}
