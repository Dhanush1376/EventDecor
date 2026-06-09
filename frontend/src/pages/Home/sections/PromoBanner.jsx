import { Link, useNavigate } from 'react-router-dom';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { useCart } from '../../../context/CartContext';
import toast from 'react-hot-toast';

/**
 * A slim, elegant promotional banner that highlights an offer or campaign.
 */
export function PromoBanner() {
  const cms = useWebsiteContent({ includeDefaults: false });
  const loading = cms?.loading;
  const navigate = useNavigate();

  // Safely get cart context (might not be available in some admin views, so default to empty object)
  const cart = useCart() || {};

  if (loading) return null;

  const promo = cms?.promoBanner;

  if (promo?.isActive === false) return null;
  if (!promo?.text || !promo?.link) {
    return null;
  }

  const ctaText = promo.ctaText || 'CLAIM OFFER';

  const renderItems = () =>
    [...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center gap-8 shrink-0">
        <span className="text-[#d4af37] text-[16px] animate-pulse">✦</span>
        <span className="text-neutral-500 font-label-sm text-[10px] tracking-[0.25em] uppercase font-bold">
          {promo.text}
        </span>
        <span className="text-[var(--color-gold-dark)] border border-[var(--color-gold-dark)]/30 group-hover:border-[var(--color-gold-dark)] px-3.5 py-1 rounded-full text-[9px] font-bold tracking-[0.15em] transition-all duration-300 bg-[var(--color-gold-dark)]/5 group-hover:bg-[var(--color-gold-dark)] group-hover:text-white">
          {ctaText}
        </span>
      </div>
    ));

  const handleBannerClick = (e) => {
    e.preventDefault();
    if (promo.couponCode) {
      if (cart.setClaimedCoupon) cart.setClaimedCoupon(promo.couponCode);
      if (cart.setAppliedCoupon) cart.setAppliedCoupon(promo.couponCode);
      toast.success(`Coupon code ${promo.couponCode} applied!`, {
        icon: '🎟️',
        style: {
          border: '1px solid #BFA15F',
          padding: '12px 16px',
          color: '#2d2b29',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        },
      });
    }
    if (promo.link) {
      navigate(promo.link);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-white py-4 border-y border-neutral-200 cursor-pointer group">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-custom {
          display: flex;
          animation: marquee-scroll 80s linear infinite;
        }
        .group:hover .animate-marquee-custom {
          animation-play-state: paused;
        }
      `,
        }}
      />
      <a href={promo.link} onClick={handleBannerClick} className="block w-full">
        <div className="flex w-full overflow-hidden relative whitespace-nowrap gap-10">
          <div className="animate-marquee-custom flex items-center gap-10 shrink-0">
            {renderItems()}
          </div>
          <div
            className="animate-marquee-custom flex items-center gap-10 shrink-0"
            aria-hidden="true"
          >
            {renderItems()}
          </div>
        </div>
      </a>
    </section>
  );
}
