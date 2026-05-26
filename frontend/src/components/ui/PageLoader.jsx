import React from "react";

/**
 * Premium branded page loader — used as Suspense fallback.
 * Uses the "S" monogram and elegant spinning rings consistent with SplashScreen.
 * Smooth fade-out is handled by React Suspense unmount + CSS transition.
 */
export const PageLoader = () => (
  <div
    className="fixed inset-0 bg-surface/80 backdrop-blur-xl flex flex-col items-center justify-center animate-page-enter"
    style={{ zIndex: "var(--z-loader)" }}
    translate="no"
  >
    {/* Top shimmer progress bar */}
    <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
      <div
        className="h-full w-1/3 rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, var(--color-gold), transparent)",
          animation: "loader-shimmer 1.5s var(--ease-smooth) infinite",
        }}
      />
    </div>

    {/* Monogram with spinning rings */}
    <div className="relative flex items-center justify-center w-20 h-20 mb-5">
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full border border-primary/20"
        style={{ animation: "spin 4s linear infinite" }}
      />
      {/* Inner ring */}
      <div
        className="absolute inset-2 rounded-full border border-primary/30 border-t-transparent border-b-transparent"
        style={{ animation: "spin 2.5s linear infinite reverse" }}
      />
      {/* Ambient glow */}
      <div className="absolute inset-3 rounded-full bg-primary/5 blur-lg animate-pulse" />
      {/* S Monogram */}
      <span className="font-display text-2xl text-primary font-light tracking-[0.15em] relative">
        S
      </span>
    </div>

    {/* Loading text */}
    <div className="space-y-2 text-center">
      <span className="font-label-sm text-[10px] uppercase tracking-[0.35em] text-primary font-bold block animate-pulse">
        Loading
      </span>
      <div className="w-10 h-[1px] bg-primary/20 mx-auto" />
    </div>

    <style>{`
      @keyframes loader-shimmer {
        0% { transform: translateX(-200%); }
        100% { transform: translateX(400%); }
      }
    `}</style>
  </div>
);

/**
 * Admin-specific loader — minimal, clean design for admin portal
 */
export const AdminLoader = () => (
  <div className="min-h-screen bg-stone-50 flex items-center justify-center" translate="no">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      <span className="text-[10px] text-stone-500 font-label uppercase tracking-widest font-bold">
        Loading Admin
      </span>
    </div>
  </div>
);
