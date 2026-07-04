import { m as motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import React, { useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { useActiveCoupons } from '../../hooks/useActiveCoupons';

export function CartDrawer({ isOpen, onClose }) {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
    cartCount,
    loading,
    appliedCoupon,
    setClaimedCoupon,
  } = useCart();
  const { data: activeCoupons = [] } = useActiveCoupons();

  const [confirmingRemove, setConfirmingRemove] = React.useState(null);

  const drawerCoupons = activeCoupons.filter((c) => c.displayLocations?.includes('cart_drawer'));

  const drawerRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      const focusableElements = drawerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab' && focusableElements) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        if (triggerElementRef.current) {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200]"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 28, stiffness: 250, mass: 0.8 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 100 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 80 || velocity.x > 400) {
                onClose();
              }
            }}
            className="fixed right-0 top-0 w-full max-w-[calc(100vw-32px)] sm:max-w-[440px] h-[100dvh] bg-white/95 backdrop-blur-2xl z-[210] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.08)] touch-pan-y border-l border-white/60"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-black/[0.04] bg-white/50 sticky top-0 z-10 backdrop-blur-md">
              <button
                onClick={onClose}
                className="group flex items-center gap-3 shrink-0 cursor-pointer"
                aria-label="Close cart"
              >
                <span
                  className="material-symbols-outlined text-[24px] text-[#1a1a1a] group-hover:-translate-x-1 transition-transform"
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  west
                </span>
                <h2 className="font-label text-[13px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] leading-none pt-0.5">
                  Cart
                </h2>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary/10 text-primary text-[13px] font-bold px-3 py-1 rounded-full shadow-sm ml-1"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-black/10 hover:scrollbar-thumb-black/20">
              {loading && items.length === 0 ? (
                <div className="space-y-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex gap-5 p-4 rounded-3xl border border-black/[0.03] bg-white/50 animate-pulse shadow-sm"
                    >
                      <div className="w-[90px] h-[110px] rounded-[16px] bg-black/5" />
                      <div className="flex-1 py-2 space-y-4">
                        <div className="h-4 bg-black/5 rounded w-3/4" />
                        <div className="h-3 bg-black/5 rounded w-1/2" />
                        <div className="h-6 bg-black/5 rounded w-1/3 mt-6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center mb-6 relative shadow-inner">
                    <span className="material-symbols-outlined text-primary text-[36px] relative z-10 opacity-80">
                      shopping_bag
                    </span>
                  </div>
                  <div className="space-y-3 mb-8">
                    <h3 className="font-display text-[26px] text-[#1a1a1a] tracking-tight">
                      Your bag is empty
                    </h3>
                    <p className="font-body text-[14px] text-black/50 font-light max-w-[240px] mx-auto leading-relaxed">
                      Discover our curated pieces and start building your dream event.
                    </p>
                  </div>
                  <Link
                    to="/collections"
                    onClick={onClose}
                    className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-1.5 font-label text-[10.5px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
                  >
                    <span>Explore Collections</span>
                    <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-8">
                  {items.filter((item) => item.type === 'purchase').length > 0 && (
                    <div className="space-y-5">
                      <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-black/40 flex items-center gap-2 ml-1">
                        <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                        Purchases
                      </h4>
                      <div className="space-y-5">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type === 'purchase')
                            .map((item) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.95,
                                  x: -30,
                                  transition: { duration: 0.2 },
                                }}
                                key={`${item.id || item._id}-${item.variant || ''}`}
                                className="relative flex gap-5 p-4 rounded-3xl bg-gradient-to-br from-white to-[#fafafa] border border-black/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group"
                              >
                                <div className="w-[85px] h-[105px] rounded-[16px] overflow-hidden flex-shrink-0 bg-[#f5f5f5] relative shadow-inner border border-black/[0.02]">
                                  {item.imageSrc || item.image ? (
                                    <CloudinaryImage
                                      src={item.imageSrc || item.image}
                                      alt={item.title}
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                      containerClassName="w-full h-full"
                                      loading="lazy"
                                      width={170}
                                      height={210}
                                      sizes="85px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20">
                                      <span className="material-symbols-outlined text-[32px]">
                                        image
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                  <div>
                                    <h3 className="font-display text-[15px] leading-snug text-[#1a1a1a] truncate group-hover:text-primary transition-colors">
                                      {item.title}
                                    </h3>
                                    {item.variant && (
                                      <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                        {item.variant}
                                      </p>
                                    )}
                                    <p className="font-display text-[15px] text-[#1a1a1a] mt-1.5 font-medium">
                                      ₹{item.price?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1.5 bg-white shadow-sm border border-black/[0.04] px-1.5 py-1 rounded-full h-9">
                                      {item.quantity > 1 ? (
                                        <button
                                          onClick={() =>
                                            updateQuantity(
                                              item.id || item._id,
                                              item.variant,
                                              item.quantity - 1,
                                            )
                                          }
                                          className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center text-black/50 hover:bg-black/5 hover:text-[#1a1a1a] transition-all cursor-pointer active:scale-95"
                                          aria-label="Decrease quantity"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">
                                            remove
                                          </span>
                                        </button>
                                      ) : (
                                        <div className="relative">
                                          <button
                                            onClick={() =>
                                              setConfirmingRemove({
                                                id: item.id || item._id,
                                                variant: item.variant,
                                              })
                                            }
                                            className={`w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${confirmingRemove?.id === (item.id || item._id) && confirmingRemove?.variant === item.variant ? 'bg-[#ff3b30] text-white shadow-md' : 'text-black/30 hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]'}`}
                                            aria-label="Confirm remove"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">
                                              {confirmingRemove?.id === (item.id || item._id) &&
                                              confirmingRemove?.variant === item.variant
                                                ? 'check'
                                                : 'delete'}
                                            </span>
                                          </button>
                                        </div>
                                      )}
                                      <span className="font-body text-[13px] w-6 text-center font-semibold text-[#1a1a1a]">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateQuantity(
                                            item.id || item._id,
                                            item.variant,
                                            item.quantity + 1,
                                          )
                                        }
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-black/50 hover:bg-black/5 hover:text-[#1a1a1a] transition-all cursor-pointer active:scale-95"
                                        aria-label="Increase quantity"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          add
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {confirmingRemove?.id === (item.id || item._id) &&
                                  confirmingRemove?.variant === item.variant && (
                                    <motion.button
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      onClick={() => {
                                        removeItem(item.id || item._id, item.variant);
                                        setConfirmingRemove(null);
                                      }}
                                      className="absolute inset-0 z-20 bg-[#ff3b30]/95 backdrop-blur-sm text-white flex flex-col items-center justify-center gap-1.5 rounded-3xl font-label text-[10px] uppercase tracking-widest font-bold shadow-inner transition-colors hover:bg-[#ff3b30]"
                                    >
                                      <span className="material-symbols-outlined text-[24px] mb-1">
                                        delete_forever
                                      </span>
                                      Tap to remove
                                    </motion.button>
                                  )}
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {items.filter((item) => item.type === 'custom').length > 0 && (
                    <div className="space-y-5">
                      <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-[#b38235]/70 flex items-center gap-2 ml-1">
                        <span className="material-symbols-outlined text-[14px]">palette</span>
                        Custom Orders
                      </h4>
                      <div className="space-y-5">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type === 'custom')
                            .map((item) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.95,
                                  x: -30,
                                  transition: { duration: 0.2 },
                                }}
                                key={`${item.id || item._id}-${item.variant || ''}`}
                                className="relative flex gap-5 p-4 rounded-3xl bg-gradient-to-br from-[#faf8f2] to-[#f5f1e6] border border-[#b38235]/10 shadow-[0_4px_20px_rgba(179,130,53,0.06)] hover:shadow-[0_12px_30px_rgba(179,130,53,0.12)] hover:-translate-y-0.5 transition-all duration-300 group"
                              >
                                <div className="w-[85px] h-[105px] rounded-[16px] overflow-hidden flex-shrink-0 bg-[#eeeade] relative shadow-inner border border-black/[0.02]">
                                  {item.imageSrc || item.image ? (
                                    <CloudinaryImage
                                      src={item.imageSrc || item.image}
                                      alt={item.title}
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                      containerClassName="w-full h-full"
                                      loading="lazy"
                                      width={170}
                                      height={210}
                                      sizes="85px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20">
                                      <span className="material-symbols-outlined text-[32px]">
                                        image
                                      </span>
                                    </div>
                                  )}
                                  <div className="absolute top-1.5 left-1.5 bg-[#b38235] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                                    Custom
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                  <div>
                                    <h3 className="font-display text-[15px] leading-snug text-[#1a1a1a] truncate group-hover:text-[#b38235] transition-colors">
                                      {item.title || 'Custom Order'}
                                    </h3>
                                    {item.variant && (
                                      <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                        {item.variant}
                                      </p>
                                    )}
                                    <p className="font-display text-[15px] text-[#1a1a1a] mt-1.5 font-medium">
                                      ₹{item.price?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1.5 bg-white shadow-sm border border-[#b38235]/10 px-1.5 py-1 rounded-full h-9">
                                      <div className="relative">
                                        <button
                                          onClick={() =>
                                            setConfirmingRemove({
                                              id: item.id || item._id,
                                              variant: item.variant,
                                            })
                                          }
                                          className={`w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${confirmingRemove?.id === (item.id || item._id) && confirmingRemove?.variant === item.variant ? 'bg-[#ff3b30] text-white shadow-md' : 'text-black/30 hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]'}`}
                                          aria-label="Confirm remove"
                                        >
                                          <span className="material-symbols-outlined text-[15px]">
                                            {confirmingRemove?.id === (item.id || item._id) &&
                                            confirmingRemove?.variant === item.variant
                                              ? 'check'
                                              : 'delete'}
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {confirmingRemove?.id === (item.id || item._id) &&
                                  confirmingRemove?.variant === item.variant && (
                                    <motion.button
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      onClick={() => {
                                        removeItem(item.id || item._id, item.variant);
                                        setConfirmingRemove(null);
                                      }}
                                      className="absolute inset-0 z-20 bg-[#ff3b30]/95 backdrop-blur-sm text-white flex flex-col items-center justify-center gap-1.5 rounded-3xl font-label text-[10px] uppercase tracking-widest font-bold shadow-inner transition-colors hover:bg-[#ff3b30]"
                                    >
                                      <span className="material-symbols-outlined text-[24px] mb-1">
                                        delete_forever
                                      </span>
                                      Tap to remove
                                    </motion.button>
                                  )}
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {items.filter((item) => item.type === 'rental').length > 0 && (
                    <div className="space-y-5">
                      <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-[#8c7335]/70 flex items-center gap-2 ml-1">
                        <span className="material-symbols-outlined text-[14px]">
                          event_available
                        </span>
                        Rentals
                      </h4>
                      <div className="space-y-5">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type === 'rental')
                            .map((item) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.95,
                                  x: -30,
                                  transition: { duration: 0.2 },
                                }}
                                key={`${item.id || item._id}-${item.variant || ''}`}
                                className="relative flex gap-5 p-4 rounded-3xl bg-gradient-to-br from-[#faf8f2] to-[#f5f1e6] border border-[#8c7335]/10 shadow-[0_4px_20px_rgba(140,115,53,0.06)] hover:shadow-[0_12px_30px_rgba(140,115,53,0.12)] hover:-translate-y-0.5 transition-all duration-300 group"
                              >
                                <div className="w-[85px] h-[105px] rounded-[16px] overflow-hidden flex-shrink-0 bg-[#eeeade] relative shadow-inner border border-black/[0.02]">
                                  {item.imageSrc || item.image ? (
                                    <CloudinaryImage
                                      src={item.imageSrc || item.image}
                                      alt={item.title}
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                      containerClassName="w-full h-full"
                                      loading="lazy"
                                      width={170}
                                      height={210}
                                      sizes="85px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20">
                                      <span className="material-symbols-outlined text-[32px]">
                                        image
                                      </span>
                                    </div>
                                  )}
                                  <div className="absolute top-1.5 left-1.5 bg-[#8c7335] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
                                    Rent
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                  <div>
                                    <h3 className="font-display text-[15px] leading-snug text-[#1a1a1a] truncate group-hover:text-[#8c7335] transition-colors">
                                      {item.title}
                                    </h3>
                                    {item.variant && (
                                      <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                        {item.variant}
                                      </p>
                                    )}
                                    <p className="font-display text-[15px] text-[#1a1a1a] mt-1.5 font-medium">
                                      ₹{item.price?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1.5 bg-white shadow-sm border border-[#8c7335]/10 px-1.5 py-1 rounded-full h-9">
                                      {item.quantity > 1 ? (
                                        <button
                                          onClick={() =>
                                            updateQuantity(
                                              item.id || item._id,
                                              item.variant,
                                              item.quantity - 1,
                                            )
                                          }
                                          className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center text-black/50 hover:bg-[#8c7335]/10 hover:text-[#8c7335] transition-all cursor-pointer active:scale-95"
                                          aria-label="Decrease quantity"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">
                                            remove
                                          </span>
                                        </button>
                                      ) : (
                                        <div className="relative">
                                          <button
                                            onClick={() =>
                                              setConfirmingRemove({
                                                id: item.id || item._id,
                                                variant: item.variant,
                                              })
                                            }
                                            className={`w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${confirmingRemove?.id === (item.id || item._id) && confirmingRemove?.variant === item.variant ? 'bg-[#ff3b30] text-white shadow-md' : 'text-black/30 hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]'}`}
                                            aria-label="Confirm remove"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">
                                              {confirmingRemove?.id === (item.id || item._id) &&
                                              confirmingRemove?.variant === item.variant
                                                ? 'check'
                                                : 'delete'}
                                            </span>
                                          </button>
                                        </div>
                                      )}
                                      <span className="font-body text-[13px] w-6 text-center font-semibold text-[#1a1a1a]">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateQuantity(
                                            item.id || item._id,
                                            item.variant,
                                            item.quantity + 1,
                                          )
                                        }
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-black/50 hover:bg-[#8c7335]/10 hover:text-[#8c7335] transition-all cursor-pointer active:scale-95"
                                        aria-label="Increase quantity"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          add
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {confirmingRemove?.id === (item.id || item._id) &&
                                  confirmingRemove?.variant === item.variant && (
                                    <motion.button
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      onClick={() => {
                                        removeItem(item.id || item._id, item.variant);
                                        setConfirmingRemove(null);
                                      }}
                                      className="absolute inset-0 z-20 bg-[#ff3b30]/95 backdrop-blur-sm text-white flex flex-col items-center justify-center gap-1.5 rounded-3xl font-label text-[10px] uppercase tracking-widest font-bold shadow-inner transition-colors hover:bg-[#ff3b30]"
                                    >
                                      <span className="material-symbols-outlined text-[24px] mb-1">
                                        delete_forever
                                      </span>
                                      Tap to remove
                                    </motion.button>
                                  )}
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with Totals & Promotions */}
            {items.length > 0 && (
              <div
                className="p-4 pt-3 border-t border-black/[0.04] space-y-2 bg-white/90 backdrop-blur-xl relative flex-shrink-0"
                style={{ paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}
              >
                {/* Promotions Panel */}
                {drawerCoupons.length > 0 && !appliedCoupon && (
                  <div className="mb-2 -mx-4 px-4">
                    <h4 className="font-display text-[9px] uppercase tracking-[0.2em] text-black/40 font-bold mb-1.5">
                      Available Offers
                    </h4>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide snap-x">
                      {drawerCoupons.map((coupon) => (
                        <div
                          key={coupon.code}
                          onClick={() => {
                            setClaimedCoupon(coupon.code);
                          }}
                          className="snap-start shrink-0 w-[200px] p-2 rounded-lg border border-[var(--color-gold-dark)]/20 bg-gradient-to-br from-[#faf8f2] to-white shadow-sm cursor-pointer hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-mono text-[10px] font-bold text-[#1a1a1a] bg-black/5 px-1.5 py-0.5 rounded">
                              {coupon.code}
                            </span>
                            <span className="text-[9px] font-bold text-[var(--color-gold-dark)] group-hover:scale-105 transition-transform">
                              Tap to Apply
                            </span>
                          </div>
                          <p className="font-body text-[10px] text-black/60 leading-tight">
                            {coupon.discountType === 'percentage'
                              ? `Get ${coupon.discountValue}% OFF`
                              : `Get ₹${coupon.discountValue} OFF`}
                            {coupon.minOrderAmount > 0 &&
                              ` on orders above ₹${coupon.minOrderAmount}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[12px]">
                  <span className="font-body text-black/50 font-medium">Subtotal</span>
                  <span className="font-display font-medium text-[#1a1a1a]">
                    ₹{subtotal.toLocaleString()}
                  </span>
                </div>
                {appliedCoupon && appliedCoupon.calculatedDiscount > 0 && (
                  <div className="flex justify-between items-center text-[12px] text-green-700 font-medium bg-green-50/50 p-1 rounded -mx-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-green-600">
                        local_activity
                      </span>
                      Discount ({appliedCoupon.code})
                    </span>
                    <span>− ₹{appliedCoupon.calculatedDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="h-[1px] bg-gradient-to-r from-transparent via-black/[0.06] to-transparent my-1.5" />

                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <span className="font-body text-[13px] font-bold text-[#1a1a1a]">
                      Estimated Total
                    </span>
                    <p className="font-body text-[9px] text-black/40 uppercase tracking-[0.1em] font-bold">
                      Shipping calculated at checkout
                    </p>
                  </div>
                  <span className="font-display text-[18px] leading-none font-bold text-[#1a1a1a]">
                    ₹{(subtotal - (appliedCoupon?.calculatedDiscount || 0)).toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 pb-1 flex gap-2">
                  <Link
                    to="/cart"
                    onClick={onClose}
                    className="flex-1 block text-center py-2.5 rounded-full font-label text-[10px] uppercase tracking-[0.15em] text-[#1a1a1a] bg-transparent hover:bg-black/5 border border-black/10 active:scale-[0.98] transition-all duration-300 font-bold group"
                  >
                    View Bag
                  </Link>
                  <Link
                    to="/checkout"
                    onMouseEnter={() =>
                      prefetchManager.prefetchRoute('/checkout', { kind: 'hover' })
                    }
                    onClick={onClose}
                    className="flex-[1.5] relative overflow-hidden block bg-[#1a1a1a] text-white py-2.5 rounded-full font-label text-[10px] uppercase tracking-[0.15em] text-center hover:bg-black active:scale-[0.98] transition-all duration-300 shadow-sm font-bold group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      Checkout
                      <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform duration-300">
                        arrow_forward
                      </span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
