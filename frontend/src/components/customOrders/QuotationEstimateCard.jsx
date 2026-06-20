import React from 'react';

export function QuotationEstimateCard({ selectedOrder, handleQuotationDecision }) {
  return (
    <>
      {selectedOrder.quotation?.items?.length > 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[var(--color-gold)] p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
              Your Quotation
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                selectedOrder.quotation.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : selectedOrder.quotation.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {selectedOrder.quotation.status}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {selectedOrder.quotation.items.map((it, i) => (
              <div
                key={it._id || it.description || i}
                className="flex justify-between text-[11px] text-[var(--color-on-surface)]/80 font-light"
              >
                <span className="truncate pr-2">{it.description}</span>
                <span className="font-mono font-medium shrink-0">
                  ₹{it.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-black/5 text-[11px] space-y-1">
            <div className="flex justify-between text-[#685C57]/80">
              <span>Taxes:</span>
              <span className="font-mono">
                ₹{selectedOrder.quotation.tax?.toLocaleString('en-IN') || '0'}
              </span>
            </div>
            <div className="flex justify-between text-[#685C57]/80">
              <span>Shipping & Setup:</span>
              <span className="font-mono">
                ₹{selectedOrder.quotation.shipping?.toLocaleString('en-IN') || '0'}
              </span>
            </div>
            <div className="flex justify-between font-bold text-[12px] pt-1.5 border-t border-dashed border-black/10">
              <span>Grand Total:</span>
              <span className="font-mono text-[var(--color-gold)]">
                ₹{selectedOrder.quotation.total?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Client quote approval/rejection panel */}
          {selectedOrder.quotation.status === 'sent' && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleQuotationDecision('approved')}
                className="flex-1 bg-[var(--color-on-surface)] hover:bg-[var(--color-gold)] text-white py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center animate-pulse"
              >
                Approve Quote
              </button>
              <button
                onClick={() => handleQuotationDecision('rejected')}
                className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-500 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Decline Quote
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--color-surface-ivory)] p-4 rounded-2xl border border-black/5 text-center py-6">
          <span className="material-symbols-outlined text-[24px] text-black/20 block mb-1">
            payments
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#685C57]">
            Preparing Quotation
          </span>
          <p className="text-[10px] text-[#685C57]/60 mt-1">
            Our team is checking your design requirements to prepare your custom pricing.
          </p>
        </div>
      )}
    </>
  );
}
