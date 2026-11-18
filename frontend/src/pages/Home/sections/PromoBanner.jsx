import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { useCart } from '../../../context/CartContext';
import { useActiveCoupons } from '../../../hooks/useActiveCoupons';
import toast from 'react-hot-toast';
import Tag from 'lucide-react/dist/esm/icons/tag';

/**
 * A slim, elegant promotional banner that highlights an offer or campaign.
 * Supports smooth continuous auto-scroll and free hand touch scrolling/dragging.
 */
const MARQUEE_SPEED_PX_PER_S = 38; // Elegant luxury speed

export function PromoBanner({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const promo = activeCms?.promoBanner;
  const navigate = useNavigate();

  // Safely get cart context (might not be available in some admin views, so default to empty object)
  const cart = useCart() || {};
  const { data: activeCoupons = [] } = useActiveCoupons();

  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const singleSetRef = useRef(null);

  const singleWidthRef = useRef(0);
  // Auto-scroll runs as a Web Animations API transform animation (compositor thread),
  // not a per-frame JS loop. Drag / wheel / momentum seek the animation instead.
  const marqueeAnimRef = useRef(null);
  const isOffscreenRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  const isInteractingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const isHoveringRef = useRef(false);
  const hasMovedRef = useRef(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const velocityRef = useRef(0);
  const totalDragDistanceRef = useRef(0);
  const isNavigatingRef = useRef(false);

  const momentumRafRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  const loading = !previewContent && cms?.loading;

  // Current scroll offset in px within one item set, derived from the animation clock.
  function getOffset() {
    const anim = marqueeAnimRef.current;
    const width = singleWidthRef.current;
    if (!anim || !width) return 0;
    const duration = anim.effect.getTiming().duration;
    const t = (Number(anim.currentTime) || 0) % duration;
    return (t / duration) * width;
  }

  // Seek the animation to an offset (wrapped into [0, width)).
  function setOffset(offset) {
    const anim = marqueeAnimRef.current;
    const width = singleWidthRef.current;
    if (!anim || !width) return;
    const wrapped = ((offset % width) + width) % width;
    anim.currentTime = (wrapped / width) * anim.effect.getTiming().duration;
  }

  // Run only when visible, not being interacted with, and motion is allowed.
  function syncPlayback() {
    const anim = marqueeAnimRef.current;
    if (!anim) return;
    const shouldRun =
      !isInteractingRef.current && !isOffscreenRef.current && !prefersReducedMotionRef.current;
    if (shouldRun && anim.playState !== 'running') anim.play();
    else if (!shouldRun && anim.playState === 'running') anim.pause();
  }
  const bannerCoupon = activeCoupons.find((c) => c.displayLocations?.includes('banner'));

  let promoText = '';
  let promoLink = '/collections';
  let ctaText = 'CLAIM OFFER';
  let couponCode = '';

  // Extract coupon code and text from CMS or fallback
  if (promo?.isActive !== false && promo?.text) {
    promoText = promo.text;
    ctaText = promo.ctaText || 'CLAIM OFFER';
    couponCode = promo.couponCode || '';
    if (!couponCode) {
      const codeFromText = promo.text.match(/USING CODE\s+([A-Za-z0-9_-]+)/i)?.[1];
      if (codeFromText) couponCode = codeFromText;
    }
  } else if (bannerCoupon) {
    const discountStr =
      bannerCoupon.discountType === 'percentage'
        ? `${bannerCoupon.discountValue}%`
        : `₹${bannerCoupon.discountValue}`;
    promoText = `LIMITED TIME OFFER: GET ${discountStr} OFF${bannerCoupon.minOrderAmount > 0 ? ` ON ORDERS ABOVE ₹${bannerCoupon.minOrderAmount}` : ''} USING CODE ${bannerCoupon.code}`;
    couponCode = bannerCoupon.code;
  }

  // Determine active coupon object for catalog targeting
  const matchedCoupon = couponCode
    ? activeCoupons.find((c) => c.code?.toUpperCase() === couponCode?.toUpperCase()) || bannerCoupon
    : bannerCoupon;

  if (matchedCoupon && !couponCode) {
    couponCode = matchedCoupon.code;
  }

  // Construct precise target URL for eligible products
  let targetLink = promo?.link || '/collections';
  if (
    matchedCoupon &&
    (!promo?.link || promo.link === '/collections' || promo.link === '/shop' || promo.link === '')
  ) {
    if (matchedCoupon.targetType === 'categories' && matchedCoupon.targetCategories?.length) {
      targetLink = `/collections?collection=${encodeURIComponent(matchedCoupon.targetCategories.join(','))}`;
    } else if (matchedCoupon.targetType === 'products' && matchedCoupon.targetProductIds?.length) {
      targetLink = `/collections?ids=${encodeURIComponent(matchedCoupon.targetProductIds.join(','))}`;
    } else {
      targetLink = '/collections';
    }
  }

  if (couponCode && !targetLink.includes('coupon=')) {
    targetLink += targetLink.includes('?') ? `&coupon=${couponCode}` : `?coupon=${couponCode}`;
  }
  promoLink = targetLink;

  // Auto-scroll: one infinite transform animation across exactly one item set. The
  // browser runs it on the compositor, so idle scrolling costs no main-thread work.
  useEffect(() => {
    if (!promoText) return;
    const track = trackRef.current;
    const set = singleSetRef.current;
    if (!track || !set || typeof track.animate !== 'function') return;

    try {
      prefersReducedMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
    } catch (_) {}

    const build = () => {
      const width = set.offsetWidth;
      if (!width) return;
      if (width === singleWidthRef.current && marqueeAnimRef.current) return;

      // Preserve the visible position when the width changes (resize, font swap).
      const prev = marqueeAnimRef.current;
      const progress =
        prev && prev.effect ? (Number(prev.currentTime) || 0) / prev.effect.getTiming().duration : 0;
      prev?.cancel();

      singleWidthRef.current = width;
      const anim = track.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(-${width}px, 0, 0)` }],
        { duration: (width / MARQUEE_SPEED_PX_PER_S) * 1000, iterations: Infinity },
      );
      anim.currentTime = (progress % 1) * anim.effect.getTiming().duration;
      marqueeAnimRef.current = anim;
      syncPlayback();
    };

    build();
    const resizeObserver = new ResizeObserver(build);
    resizeObserver.observe(set);

    // Stop the animation entirely while the banner is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => {
      isOffscreenRef.current = !entry.isIntersecting;
      syncPlayback();
    });
    if (containerRef.current) io.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      io.disconnect();
      marqueeAnimRef.current?.cancel();
      marqueeAnimRef.current = null;
      singleWidthRef.current = 0;
      if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
    // `loading` matters because the banner renders nothing (no refs) while loading.
  }, [promoText, loading]);

  if (loading || !promoText) return null;

  // Helper to schedule resume after inactivity
  const scheduleResume = (delayMs = 2000) => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (!isPointerDownRef.current && !isHoveringRef.current) {
        isInteractingRef.current = false;
        syncPlayback();
      }
    }, delayMs);
  };

  // Pointer Down (touch or mouse) - halt immediately and lock position
  const handlePointerDown = (e) => {
    isPointerDownRef.current = true;
    isInteractingRef.current = true;
    hasMovedRef.current = false;
    totalDragDistanceRef.current = 0;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
    syncPlayback();

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startOffsetRef.current = getOffset();
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  // Pointer Move - 1:1 free hand drag with instant responsiveness
  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - (startYRef.current ?? e.clientY);
    const dist = Math.hypot(dx, dy);
    totalDragDistanceRef.current = Math.max(totalDragDistanceRef.current, dist);

    if (dist > 12) {
      hasMovedRef.current = true;
      try {
        if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }
      } catch (_) {}
    }

    const now = performance.now();
    const dt = Math.max(now - lastTimeRef.current, 1);
    // Exponential smoothing on velocity for realistic inertia
    const instantaneousV = (e.clientX - lastXRef.current) / dt;
    velocityRef.current = velocityRef.current * 0.4 + instantaneousV * 0.6;
    lastXRef.current = e.clientX;
    lastTimeRef.current = now;

    setOffset(startOffsetRef.current - dx);
  };

  // Pointer Up / Cancel - start momentum inertia if flicked, then pause & schedule resume
  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
    } catch (_) {}

    if (totalDragDistanceRef.current < 12) {
      hasMovedRef.current = false;
    }

    const v = velocityRef.current; // px per ms (positive means dragged right -> scroll decreases)

    if (Math.abs(v) > 0.18) {
      // Natural flick inertia glide
      let currentVelocity = -v * 1000; // convert to px/sec in scroll direction
      let momentumTime = performance.now();

      const momentumStep = (now) => {
        const dt = Math.min((now - momentumTime) / 1000, 0.05);
        momentumTime = now;
        currentVelocity *= 0.93; // Smooth friction decay

        setOffset(getOffset() + currentVelocity * dt);

        if (Math.abs(currentVelocity) > 25) {
          momentumRafRef.current = requestAnimationFrame(momentumStep);
        } else {
          // Coasting stopped, wait for inactivity period before auto-scrolling again
          scheduleResume(2000);
        }
      };

      momentumRafRef.current = requestAnimationFrame(momentumStep);
    } else {
      // Stopped without flick, pause and resume after inactivity period
      scheduleResume(2000);
    }
  };

  // Desktop Hover Handlers
  const handleMouseEnter = (e) => {
    if (e.pointerType === 'touch') return; // Don't stick on touch tap
    isHoveringRef.current = true;
    isInteractingRef.current = true;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    syncPlayback();
  };

  const handleMouseLeave = (e) => {
    if (e.pointerType === 'touch') return;
    isHoveringRef.current = false;
    if (!isPointerDownRef.current) {
      scheduleResume(1400);
    }
  };

  // Wheel / Trackpad horizontal swipe support
  const handleWheel = (e) => {
    isInteractingRef.current = true;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
    syncPlayback();

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    setOffset(getOffset() + delta);

    scheduleResume(2000);
  };

  const handleActionClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (hasMovedRef.current || isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1200);

    if (couponCode) {
      if (cart.setClaimedCoupon) cart.setClaimedCoupon(couponCode);
      if (cart.setAppliedCoupon) cart.setAppliedCoupon(couponCode);
      toast.success(`Coupon code ${couponCode} applied!`, {
        id: 'promo-banner-coupon',
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
      navigate(promoLink, { state: { scrollToShop: true } });
    }
  };

  const renderItems = (prefix) =>
    [...Array(4)].map((_, i) => (
      <div
        key={`${prefix}-${i}`}
        className="inline-flex items-center gap-6 sm:gap-8 shrink-0 cursor-pointer group/item py-0.5 select-none"
      >
        <Tag className="w-3.5 h-3.5 text-[var(--color-primary-variant)] shrink-0 pointer-events-none" />
        <span className="text-neutral-900 font-label-sm text-[10px] sm:text-[10.5px] tracking-[0.22em] uppercase font-bold whitespace-nowrap select-none pointer-events-none">
          {promoText}
        </span>
        <span className="text-white border border-[var(--color-gold-dark)] px-3 sm:px-3.5 py-0.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9px] font-bold tracking-[0.15em] transition-all duration-300 bg-[var(--color-gold-dark)] group-hover/item:bg-neutral-900 group-hover/item:border-neutral-900 group-hover/item:scale-105 shrink-0 select-none shadow-sm pointer-events-none">
          {ctaText}
        </span>
      </div>
    ));

  return (
    <section className="relative z-50 w-full overflow-hidden bg-white py-3.5 sm:py-4 border-y border-neutral-200 select-none">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleActionClick}
        className="w-full overflow-hidden cursor-pointer active:cursor-grabbing select-none"
        style={{
          touchAction: 'pan-y',
        }}
      >
        <div
          ref={trackRef}
          className="flex w-max will-change-transform select-none"
        >
          <div
            ref={singleSetRef}
            className="flex shrink-0 items-center gap-6 sm:gap-8 pr-6 sm:pr-8"
          >
            {renderItems('set-0')}
          </div>
          <div className="flex shrink-0 items-center gap-6 sm:gap-8 pr-6 sm:pr-8">
            {renderItems('set-1')}
          </div>
          <div className="flex shrink-0 items-center gap-6 sm:gap-8 pr-6 sm:pr-8">
            {renderItems('set-2')}
          </div>
          <div className="flex shrink-0 items-center gap-6 sm:gap-8 pr-6 sm:pr-8">
            {renderItems('set-3')}
          </div>
        </div>
      </div>
    </section>
  );
}
