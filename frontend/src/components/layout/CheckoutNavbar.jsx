import { Link } from 'react-router-dom';
import { SiriLogo } from '../ui/SiriLogo';

export function CheckoutNavbar() {
  return (
    <header className="bg-surface-bright border-b border-outline-variant/40 py-3 sm:py-4 px-4 sm:px-6 sticky top-0 z-50">
      <div className="max-w-max-width mx-auto flex items-center justify-between gap-4">
        {/* Left: Back Button */}
        <div className="flex-1">
          <Link
            to="/cart"
            className="group inline-flex items-center gap-1.5 text-secondary hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">
              keyboard_backspace
            </span>
            <span className="font-label text-[10px] sm:text-[11px] uppercase tracking-widest font-bold">
              Back to Cart
            </span>
          </Link>
        </div>

        {/* Center: Branding (Visible on sm+) */}
        <div className="hidden md:block flex-1 text-center">
          <Link to="/" className="inline-block group">
            <SiriLogo size="36px" showSubtitle={false} />
          </Link>
        </div>

        {/* Right: Step Indicator & Badges */}
        <div className="flex-1 flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-6">
          <div className="flex flex-col items-end">
            <span className="font-label text-[9px] uppercase tracking-widest text-secondary/60">
              Siri Arts & Crafts
            </span>
            <span className="font-body text-[13px] sm:text-[14px] font-bold text-primary">
              Secure Checkout
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-secondary border-l border-outline-variant/30 pl-6 h-8">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-green-700">lock</span>
              Secure
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
