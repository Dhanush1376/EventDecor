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
          className="sticky-mobile-atc fixed left-4 right-4 bottom-28 z-[110] md:hidden bg-surface/95 backdrop-blur-3xl border border-outline-variant/10 p-3 pl-6 flex items-center justify-between gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[32px] select-none"
        >
          <div className="flex flex-col truncate">
            <span className="font-label text-[9px] uppercase tracking-[0.3em] text-on-surface-variant/50 font-bold leading-none">
              Studio Investment
            </span>
            <p className="font-display text-[20px] text-primary font-bold leading-none mt-2 italic">
              ₹ {product?.price?.toLocaleString("en-IN")}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            className="bg-on-surface text-surface h-14 px-8 rounded-full font-label text-[11px] uppercase tracking-[0.25em] font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-[18px]">
              shopping_bag
            </span>
            Add to Bag
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
