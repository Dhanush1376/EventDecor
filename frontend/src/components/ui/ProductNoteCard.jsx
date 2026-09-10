import { Info, Gift } from 'lucide-react';
import React from 'react';

export function ProductNoteCard({ customerNote, complimentaryGift, dimensions }) {
  if (!customerNote && !complimentaryGift?.enabled && !dimensions) return null;

  return (
    <div className="space-y-4">
      {/* Designer's Note & Dimensions Section */}
      {(customerNote || dimensions) && (
        <div className="flex items-start gap-3 p-3.5 bg-[#fdfbf7] rounded-xl border border-[#e0d6b8] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#f5ecd5]/50 to-transparent rounded-full blur-2xl pointer-events-none"></div>
          <Info
            className="text-[18px] text-[#8c7335] shrink-0 mt-0.5 relative z-10"
            strokeWidth={1.5}
          />
          <div className="flex flex-col relative z-10 w-full">
            <span className="font-label-sm text-[11px] sm:text-[12px] text-[#8c7335] uppercase tracking-[0.1em] font-bold">
              {customerNote && dimensions
                ? "Designer's Note & Dimensions"
                : customerNote
                  ? "Designer's Note"
                  : 'Product Dimensions'}
            </span>

            {customerNote && (
              <span className="font-body-sm text-[13px] sm:text-[14px] text-on-surface/80 font-medium mt-0.5 whitespace-pre-wrap">
                {customerNote}
              </span>
            )}

            {customerNote && dimensions && <hr className="my-2.5 border-[#e0d6b8]/60 w-full" />}

            {dimensions && (
              <div className={!customerNote ? 'mt-0.5' : ''}>
                <span className="font-body-sm text-[13px] sm:text-[14px] text-on-surface/80 font-medium">
                  <strong className="text-[#2a2c2a] uppercase tracking-wider text-[10px] mr-1">
                    Dimensions:
                  </strong>
                  {dimensions}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complimentary Gift Section */}
      {complimentaryGift?.enabled && (
        <div className="flex items-start gap-3 p-3.5 bg-[#f7f9fc] rounded-xl border border-[#cbdce8] shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#dbeafe]/40 to-transparent rounded-full blur-2xl pointer-events-none" />
          <Gift
            className="w-[18px] h-[18px] text-[#1e4976] shrink-0 mt-0.5 relative z-10"
            strokeWidth={1.5}
          />
          <div className="flex flex-col relative z-10 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="font-label-sm text-[11px] sm:text-[12px] text-[#1e4976] uppercase tracking-[0.1em] font-bold">
                Complimentary Gift
              </span>
              {complimentaryGift.displayBadge ? (
                <span className="px-2 py-0.5 bg-[#1e4976]/10 text-[#1e4976] border border-[#1e4976]/20 text-[9px] uppercase tracking-wider font-bold rounded-md">
                  {complimentaryGift.displayBadge}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e4976] bg-[#1e4976]/10 px-1.5 py-0.5 rounded">
                  Included Free
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-body-sm text-[13px] sm:text-[14px] text-on-surface/90 font-semibold">
                {complimentaryGift.quantity} × {complimentaryGift.name || 'Surprise Gift'}
              </span>
            </div>

            {complimentaryGift.description && (
              <span className="font-body-sm text-[12px] sm:text-[13px] text-on-surface/70 font-medium mt-1 leading-relaxed">
                {complimentaryGift.description}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
