import { m as motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { couponService } from '../../services/domainServices';

export function StickyMobileATC({ product, triggerRef }) {
  const { addItem, setIsCartOpen, claimedCoupon } = useCart();
  const { runProtectedAction } = useAuth();
  const [isVisible, setIsVisible] = React.useState(false);
  const [isScrollingDown, setIsScrollingDown] = React.useState(false);
  const lastScrollY = React.useRef(0);

  const productId = product?._id || product?.id;
  const { data: couponsData } = useQuery({
    queryKey: ['product-coupons', productId],
    queryFn: () => couponService.getProductCoupons(productId),
    enabled: !!productId,
  });

  const allCoupons = couponsData?.data?.all || [];
  const activeCoupon = allCoupons.find((c) => c.code === claimedCoupon);

  let discountedPrice = product?.price || 0;
  if (activeCoupon && product?.price) {
    const isPercentage = activeCoupon.discountType === 'percentage';
    if (isPercentage) {
      discountedPrice = product.price * (1 - activeCoupon.discountValue / 100);
    } else {
      discountedPrice = Math.max(0, product.price - activeCoupon.discountValue);
    }
  }

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Use 10px threshold to avoid tiny jitter or bounce triggers
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setIsScrollingDown(true);
        } else {
          setIsScrollingDown(false);
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (!triggerRef?.current) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar only when main button is NOT intersecting
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [triggerRef]);

  // Coordinate with BottomNav: hide it when this sticky ATC is visible to avoid tap conflicts
  React.useEffect(() => {
    if (isVisible && !isScrollingDown) {
      document.body.classList.add('sticky-atc-active');
    } else {
      document.body.classList.remove('sticky-atc-active');
    }
    return () => document.body.classList.remove('sticky-atc-active');
  }, [isVisible, isScrollingDown]);

  const handleAddToCart = () => {
    runProtectedAction(() => {
      addItem({
        id: product.id,
        title: product.title,
        price: product.price,
        imageSrc: product.imageSrc || product.image,
        formattedPrice: `Rs. ${product.price?.toLocaleString()}`,
        quantity: 1,
      });
      setIsCartOpen(true);
    });
  };

  return (
    <AnimatePresence>
      {isVisible && !isScrollingDown && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="sticky-mobile-atc fixed bottom-0 left-0 w-full h-[calc(72px+env(safe-area-inset-bottom,0px))] lg:h-[80px] z-[100] lg:hidden bg-white/95 backdrop-blur-xl border-t border-outline-variant/15 px-6 pb-[env(safe-area-inset-bottom,0px)] flex items-center justify-between gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] select-none"
        >
          <div className="flex flex-col truncate">
            <span className="font-label text-[8px] uppercase tracking-[0.25em] text-stone-500 font-bold leading-none">
              Price
            </span>
            <p className="font-display text-[18px] text-black font-medium leading-none mt-1.5">
              {activeCoupon ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="line-through text-stone-400 text-[11px] font-normal">
                    ₹{product?.price?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-green-700">
                    ₹{discountedPrice?.toLocaleString('en-IN')}
                  </span>
                </span>
              ) : (
                `₹${product?.price?.toLocaleString('en-IN')}`
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="bg-black text-white h-10 px-5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-lg active:scale-[0.96] transition-all flex items-center justify-center gap-1.5 shrink-0 border-none cursor-pointer"
            aria-label={`Add ${product?.title || 'product'} to bag`}
          >
            <span className="material-symbols-outlined text-[15px]">shopping_bag</span>
            <span>Add to Bag</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
