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
          Quotation Estimate Details
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

      <div className="space-y-3 text-[11px] text-on-surface">
        <div className="flex justify-between">
          <span className="text-secondary">Event Decor & Rental</span>
          <span className="font-semibold">
            ₹{selectedBooking.pricing?.rentalFee?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">Bespoke Setup Logistics Crew Labor</span>
          <span className="font-semibold">
            ₹{selectedBooking.pricing?.setupCharges?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">Logistics Transportation Fleet Cost</span>
          <span className="font-semibold">
            ₹{selectedBooking.pricing?.transportationCost?.toLocaleString('en-IN')}
          </span>
        </div>
        {selectedBooking.selectedAddons?.map((addon, idx) => (
          <div key={idx} className="flex justify-between">
            <span className="text-secondary">+ {addon.name}</span>
            <span className="font-semibold">₹{addon.price?.toLocaleString('en-IN')}</span>
          </div>
        ))}

        <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-sm text-primary">
          <span>Total Estimate Contract Price</span>
          <span>₹{selectedBooking.pricing?.totalPrice?.toLocaleString('en-IN')}</span>
        </div>

        <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-[11px]">
          <div className="flex flex-col">
            <span className="text-on-surface">Milestone Deposit Required</span>
            <span className="text-[9px] text-secondary font-normal uppercase tracking-widest mt-0.5">
              25% to confirm schedules
            </span>
          </div>
          <span>₹{selectedBooking.pricing?.depositAmount?.toLocaleString('en-IN')}</span>
        </div>

        <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-[11px] pb-3 border-b border-outline-variant/20">
          <div className="flex flex-col">
            <span className="text-on-surface">Pending Balance Remaining</span>
            <span className="text-[9px] text-secondary font-normal uppercase tracking-widest mt-0.5">
              Payment Status: {selectedBooking.pricing?.paymentStatus}
            </span>
          </div>
          <span className="text-sm text-primary">
            ₹{selectedBooking.pricing?.pendingBalance?.toLocaleString('en-IN')}
          </span>
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

        {selectedBooking.pricing?.pendingBalance > 0 && (
          <div className="bg-amber-50/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 border border-amber-200/50 mt-4">
            <span className="text-[9px] uppercase tracking-widest text-amber-800 font-bold flex items-center gap-1.5">
              <AlertTriangle className="text-[14px]" strokeWidth={1.5} />
              Payment Pending
            </span>
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
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 border-0 disabled:opacity-50 cursor-pointer"
            >
              LODGE MILESTONE PAYMENT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
