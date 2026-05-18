import React from "react";

export function MobileStickyCTA({
  activeTab,
  estimatedPackagePrice,
  onAction,
}) {
  if (activeTab !== "builder") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden p-4 bg-surface-bright/90 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-safe-area-inset-bottom">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-label-sm text-[9px] uppercase tracking-widest text-secondary font-bold">
            Estimated Quote
          </p>
          <p className="font-display text-[20px] text-primary font-medium">
            ₹{estimatedPackagePrice.toLocaleString("en-IN")}
          </p>
        </div>
        <button
          onClick={onAction}
          className="flex-1 bg-on-surface text-surface py-3.5 rounded-full font-label-sm text-[10px] uppercase tracking-widest font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Lock & Dispatch</span>
          <span className="material-symbols-outlined text-[14px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}
