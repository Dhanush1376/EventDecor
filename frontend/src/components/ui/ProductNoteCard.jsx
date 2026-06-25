import React from 'react';

export function ProductNoteCard({ customerNote, complimentaryGift }) {
  if (!customerNote && !complimentaryGift?.enabled) return null;

  return (
    <div className="space-y-4">
      {/* Designer's Note Section */}
      {customerNote && (
        <div className="flex items-start gap-3 p-3.5 bg-[#fdfbf7] rounded-xl border border-[#e0d6b8] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#f5ecd5]/50 to-transparent rounded-full blur-2xl pointer-events-none"></div>
          <span className="material-symbols-outlined text-[18px] text-[#8c7335] shrink-0 mt-0.5 relative z-10">
            info
          </span>
          <div className="flex flex-col relative z-10">
            <span className="font-label-sm text-[11px] sm:text-[12px] text-[#8c7335] uppercase tracking-[0.1em] font-bold">
              Designer's Note
            </span>
            <span className="font-body-sm text-[13px] sm:text-[14px] text-on-surface/80 font-medium mt-0.5 whitespace-pre-wrap">
              {customerNote}
            </span>
          </div>
        </div>
      )}

      {/* Complimentary Gift Section */}
      {complimentaryGift?.enabled && (
        <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] rounded-xl border border-[#bae6fd] shadow-sm relative overflow-hidden group">
          {/* Decorative Background */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/40 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 p-2 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[64px]">card_giftcard</span>
          </div>

          <div className="w-10 h-10 rounded-full bg-white/80 shadow-sm flex items-center justify-center shrink-0 relative z-10 text-[#0284c7]">
            <span className="material-symbols-outlined text-[20px]">
              featured_seasonal_and_gifts
            </span>
          </div>

          <div className="flex flex-col relative z-10 flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-display text-[15px] sm:text-[17px] text-[#0369a1] font-bold tracking-tight">
                Complimentary Gift Included
              </span>
              {complimentaryGift.displayBadge && (
                <span className="px-2 py-0.5 bg-[#0284c7] text-white text-[9px] uppercase tracking-widest font-bold rounded-md shadow-sm">
                  {complimentaryGift.displayBadge}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[14px] font-bold text-[#0c4a6e]">
                {complimentaryGift.quantity} × {complimentaryGift.name || 'Surprise Gift'}
              </span>
            </div>

            {complimentaryGift.description && (
              <span className="font-body-sm text-[12px] sm:text-[13px] text-[#075985]/80 font-medium mt-1.5 leading-relaxed">
                {complimentaryGift.description}
              </span>
            )}

            <div className="mt-3 inline-block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0284c7] bg-white/60 px-2.5 py-1 rounded-md border border-white/80">
                Included Free With Purchase
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
