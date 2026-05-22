import React from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export function StickyMobileATC({ product, triggerRef }) {
  const { addItem, setIsCartOpen } = useCart();
  const { runProtectedAction } = useAuth();
  const [isVisible, setIsVisible] = React.useState(false);

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
      {isVisible && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="sticky-mobile-atc fixed left-3 right-3 bottom-24 z-[110] md:hidden bg-surface/95 backdrop-blur-3xl border border-outline-variant/10 px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_12px_36px_rgba(0,0,0,0.15)] rounded-[28px] select-none"
        >
          <div className="flex flex-col truncate">
            <span className="font-label text-[8px] uppercase tracking-[0.25em] text-on-surface-variant/45 font-bold leading-none">
              Price
            </span>
            <p className="font-sans text-[15px] text-black font-bold leading-none mt-1">
              ₹ {product?.price?.toLocaleString("en-IN")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="bg-on-surface text-surface h-10 px-5 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
            aria-label={`Add ${product?.title || 'product'} to bag`}
          >
            <span className="material-symbols-outlined text-[15px]">
              shopping_bag
            </span>
            Add to Bag
          </button>
        </motion.div>

      )}
    </AnimatePresence>
  );
}
