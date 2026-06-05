/**
 * Premium branded page loader — used as Suspense fallback.
 * Uses the "S" monogram and elegant spinning rings consistent with SplashScreen.
 * Smooth fade-out is handled by React Suspense unmount + CSS transition.
 */
export const PageLoader = () => (
  <div
    className="fixed top-0 left-0 w-full h-[3px] overflow-hidden"
    style={{ zIndex: 999999 }}
    translate="no"
  >
    <div
      className="h-full w-1/3"
      style={{
        background: 'var(--color-gold, #d4af37)',
        animation: 'loader-shimmer 1.5s linear infinite',
      }}
    />
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
      <div className="skeleton-box inline-block w-10 h-10 rounded-md" />
      <span className="text-[10px] text-stone-500 font-label uppercase tracking-widest font-bold">
        Loading Admin
      </span>
    </div>
  </div>
);
