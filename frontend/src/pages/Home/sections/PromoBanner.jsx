import { useNavigate } from 'react-router-dom';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { useCart } from '../../../context/CartContext';
import { useActiveCoupons } from '../../../hooks/useActiveCoupons';
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

  const { data: activeCoupons = [] } = useActiveCoupons();

  if (loading) return null;

  const bannerCoupon = activeCoupons.find((c) => c.displayLocations?.includes('banner'));

  const promo = cms?.promoBanner;

  let promoText = '';
  let promoLink = '/coupons';
  let ctaText = 'CLAIM OFFER';
  let couponCode = '';

  // CMS configuration takes priority if active and has text
  if (promo?.isActive !== false && promo?.text) {
    promoText = promo.text;
    let targetLink = promo.link || '/collections';
    ctaText = promo.ctaText || 'CLAIM OFFER';
    couponCode = promo.couponCode;
    if (couponCode && !targetLink.includes('coupon=')) {
      targetLink += targetLink.includes('?') ? `&coupon=${couponCode}` : `?coupon=${couponCode}`;
    }
    promoLink = targetLink;
  } else if (bannerCoupon) {
    // Fallback to active coupon with 'banner' display location
    const discountStr =
      bannerCoupon.discountType === 'percentage'
        ? `${bannerCoupon.discountValue}%`
        : `₹${bannerCoupon.discountValue}`;
    promoText = `LIMITED TIME OFFER: GET ${discountStr} OFF${bannerCoupon.minOrderAmount > 0 ? ` ON ORDERS ABOVE ₹${bannerCoupon.minOrderAmount}` : ''} USING CODE ${bannerCoupon.code}`;
    couponCode = bannerCoupon.code;

    let targetLink = '/collections';
    if (bannerCoupon.targetType === 'categories' && bannerCoupon.targetCategories?.length) {
      targetLink = `/collections?collection=${bannerCoupon.targetCategories.join(',')}`;
    } else if (bannerCoupon.targetType === 'products' && bannerCoupon.targetProductIds?.length) {
      targetLink = `/collections?ids=${bannerCoupon.targetProductIds.join(',')}`;
    }
    targetLink += targetLink.includes('?')
      ? `&coupon=${bannerCoupon.code}`
      : `?coupon=${bannerCoupon.code}`;
    promoLink = targetLink;
  } else {
    return null;
  }

  const renderItems = () =>
    [...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center gap-8 shrink-0">
        <span className="text-[#d4af37] text-[16px] animate-pulse">✦</span>
        <span className="text-neutral-500 font-label-sm text-[10px] tracking-[0.25em] uppercase font-bold">
          {promoText}
        </span>
        <span className="text-[var(--color-gold-dark)] border border-[var(--color-gold-dark)]/30 group-hover:border-[var(--color-gold-dark)] px-3.5 py-1 rounded-full text-[9px] font-bold tracking-[0.15em] transition-all duration-300 bg-[var(--color-gold-dark)]/5 group-hover:bg-[var(--color-gold-dark)] group-hover:text-white">
          {ctaText}
        </span>
      </div>
    ));

  const handleBannerClick = (e) => {
    e.preventDefault();
    if (couponCode) {
      if (cart.setClaimedCoupon) cart.setClaimedCoupon(couponCode);
      if (cart.setAppliedCoupon) cart.setAppliedCoupon(couponCode);
      toast.success(`Coupon code ${couponCode} applied!`, {
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
    if (promoLink) {
      navigate(promoLink);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-white py-4 border-y border-neutral-200 cursor-pointer group">
      <style>
        {`
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
        `}
      </style>
      <a href={promoLink} onClick={handleBannerClick} className="block w-full">
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
