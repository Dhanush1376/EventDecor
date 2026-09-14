import React from 'react';
import { ArrowRight } from 'lucide-react';

export function StoreClosedBanner({ onShowDetails }) {
  return (
    <aside
      aria-label="Store closed notice"
      className="fixed bottom-[48px] left-5 right-5 sm:left-10 sm:right-10 lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl z-[85] select-none pointer-events-auto transition-all duration-300"
    >
      <div className="w-full bg-[#141414]/95 backdrop-blur-xl border-t border-x border-white/15 lg:border text-white pt-1.5 pb-[34px] lg:pb-2 lg:pt-2 px-3 sm:px-4 rounded-t-xl sm:rounded-t-2xl lg:rounded-full shadow-[0_-3px_16px_rgba(0,0,0,0.3)] flex items-center justify-between gap-2">
        {/* Indicator and Concise Notice */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          <p className="text-[10px] sm:text-[11px] font-medium text-white/90 truncate tracking-wide">
            <span className="sm:hidden">Store temporarily closed</span>
            <span className="hidden sm:inline">
              Store temporarily closed • Online orders paused
            </span>
          </p>
        </div>

        {/* Compact Details Action */}
        {onShowDetails && (
          <button
            onClick={onShowDetails}
            style={{ minHeight: '0px', height: '18px' }}
            className="min-h-0 !min-h-0 h-[18px] group shrink-0 inline-flex items-center justify-center gap-1 px-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-[8px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border border-white/20 hover:border-white active:scale-95 leading-none"
          >
            <span className="leading-none">Details</span>
            <ArrowRight className="w-2 h-2 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
