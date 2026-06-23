export function QuotationCard({
  selectedBooking,
  handleApproveQuote,
  setPaymentAmount,
  setIsPaymentModalOpen,
}) {
  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs text-[11px]">
      <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-outline-variant/20 pb-3 gap-2">
        <h3 className="font-display text-lg text-black font-bold">Quotation Estimate Details</h3>
        <span
          className={`px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold self-start md:self-auto ${
            selectedBooking.clientApproved
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {selectedBooking.clientApproved ? 'Approved by Client' : 'Awaiting Client Approval'}
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-black/50 leading-snug">Event Decor & Rental:</span>
          <span className="text-black font-semibold shrink-0">
            ₹{selectedBooking.pricing?.rentalFee?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-black/50 leading-snug">Bespoke Setup Logistics Crew Labor:</span>
          <span className="text-black font-semibold shrink-0">
            ₹{selectedBooking.pricing?.setupCharges?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-black/50 leading-snug">Logistics Transportation Fleet Cost:</span>
          <span className="text-black font-semibold shrink-0">
            ₹{selectedBooking.pricing?.transportationCost?.toLocaleString('en-IN')}
          </span>
        </div>
        {selectedBooking.selectedAddons?.map((addon, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span className="text-black/50 leading-snug">+ {addon.name}:</span>
            <span className="text-black font-semibold shrink-0">
              ₹{addon.price?.toLocaleString('en-IN')}
            </span>
          </div>
        ))}

        <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end gap-3">
          <span className="font-display text-sm text-on-surface font-bold leading-snug">
            Total Estimate Contract Price:
          </span>
          <span className="font-display text-lg text-on-surface font-bold italic shrink-0">
            ₹{selectedBooking.pricing?.totalPrice?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end gap-3">
          <div className="space-y-0.5">
            <span className="font-display text-[11px] text-on-surface font-bold block leading-snug">
              Milestone Deposit Required:
            </span>
            <span className="font-body text-[10px] text-secondary block">
              25% to confirm schedules
            </span>
          </div>
          <span className="font-display text-sm text-primary font-bold shrink-0">
            ₹{selectedBooking.pricing?.depositAmount?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="border-t border-outline-variant/20 pt-4 flex justify-between items-end gap-3">
          <div className="space-y-0.5">
            <span className="font-display text-[11px] text-on-surface font-bold block leading-snug">
              Pending Balance Remaining:
            </span>
            <span className="font-body text-[10px] text-secondary block capitalize">
              Payment Status: {selectedBooking.pricing?.paymentStatus}
            </span>
          </div>
          <span className="font-display text-lg text-on-surface font-bold italic shrink-0">
            ₹{selectedBooking.pricing?.pendingBalance?.toLocaleString('en-IN')}
          </span>
        </div>

        {selectedBooking.status === 'quotation_sent' && !selectedBooking.clientApproved && (
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-outline-variant/20 mt-4">
            <button
              onClick={() => handleApproveQuote(false)}
              className="py-2.5 rounded-full border border-outline-variant text-secondary font-label text-[9px] uppercase tracking-widest font-bold hover:bg-surface-container transition-colors"
            >
              Request Revisions
            </button>
            <button
              onClick={() => handleApproveQuote(true)}
              className="bg-black text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors shadow-lg"
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
            className="w-full mt-4 bg-primary text-white py-2.5 rounded-full font-label text-[9px] uppercase tracking-widest font-bold shadow-md hover:shadow-primary/10 transition-all flex items-center justify-center gap-1.5"
          >
            Lodge Milestone Payment
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
          </button>
        )}
      </div>
    </div>
  );
}
