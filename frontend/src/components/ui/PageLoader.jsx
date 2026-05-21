import React from "react";

export const PageLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-white/10 backdrop-blur-xl flex flex-col items-center justify-center" translate="no">
    <div className="relative flex items-center justify-center w-24 h-24 mb-6">
      <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_4s_linear_infinite]" />
      <div className="absolute inset-2 bg-primary/5 rounded-full animate-pulse blur-xl" />
      <div className="absolute inset-3 border border-primary/40 border-t-transparent border-b-transparent rounded-full animate-[spin_2s_linear_infinite]" />
      <span className="font-display text-3xl text-primary font-light tracking-[0.2em]">S</span>
    </div>
    <div className="space-y-2 text-center">
      <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold block animate-pulse">Loading Studio</span>
      <div className="w-12 h-[1px] bg-primary/20 mx-auto" />
    </div>
  </div>
);

export const AdminLoader = () => (
  <div className="min-h-screen bg-stone-50 flex items-center justify-center" translate="no">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <span className="text-[10px] text-stone-500 font-label uppercase tracking-widest font-bold">Loading Admin</span>
    </div>
  </div>
);
