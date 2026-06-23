import { m as motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import React, { useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';

export function CartDrawer({ isOpen, onClose }) {
  const { items, removeItem, updateQuantity, subtotal, cartCount, loading, appliedCoupon } =
    useCart();
  const [confirmingRemove, setConfirmingRemove] = React.useState(null); // { id, variant }

  const drawerRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);

  // Lock body scroll and handle focus trap when drawer is open
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Simple focus trap
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
            onClick={onClose}
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-[200]"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 100 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 80 || velocity.x > 400) {
                onClose();
              }
            }}
            className="fixed right-0 top-0 w-full max-w-[calc(100vw-48px)] sm:max-w-md h-[100dvh] bg-white z-[210] flex flex-col shadow-2xl touch-pan-y"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-[22px]">Shopping Bag</h2>
                {cartCount > 0 && (
                  <span className="bg-primary/10 text-primary text-[12px] font-bold px-2.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="icon-button-touch-target text-secondary hover:text-on-surface transition-colors"
                aria-label="Close shopping bag"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && items.length === 0 ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 rounded-[20px] border border-outline-variant/5 bg-surface-container-low animate-pulse"
                    >
                      <div className="w-20 h-24 rounded-[12px] bg-surface-container" />
                      <div className="flex-1 py-2 space-y-4">
                        <div className="h-4 bg-surface-container rounded w-3/4" />
                        <div className="h-3 bg-surface-container rounded w-1/2" />
                        <div className="h-5 bg-surface-container rounded w-1/4 mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  {/* Minimalist Premium Icon Container */}
                  <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl" />
                    <span className="material-symbols-outlined text-primary text-[30px] relative z-10">
                      shopping_bag
                    </span>
                  </div>

                  <div className="space-y-2 mb-8">
                    <h3 className="font-display text-[22px] text-on-surface tracking-tight">
                      Your bag is empty
                    </h3>
                    <p className="font-body text-[13px] text-secondary/60 font-light max-w-[220px] mx-auto leading-relaxed">
                      Discover our curated pieces and start building your dream event.
                    </p>
                  </div>

                  <Link
                    to="/collections"
                    onClick={onClose}
                    className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
                  >
                    <span>Explore Collections</span>
                    <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {items.filter((item) => item.type !== 'rental').length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-[#685c57] border-b border-outline-variant/20 pb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                        Purchases
                      </h4>
                      <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type !== 'rental')
                            .map((item) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.9,
                                  x: -30,
                                  transition: { duration: 0.2 },
                                }}
                                key={`${item.id}-${item.variant || ''}`}
                                className="relative flex gap-4 p-4 rounded-[20px] bg-surface-container-low border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                              >
                                <div className="w-20 h-24 rounded-[12px] overflow-hidden flex-shrink-0 bg-surface-container relative">
                                  <CloudinaryImage
                                    src={item.imageSrc || item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    containerClassName="w-full h-full"
                                    loading="lazy"
                                    width={160}
                                    height={192}
                                    sizes="80px"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                    <h3 className="font-display text-[15px] leading-tight truncate">
                                      {item.title}
                                    </h3>
                                    {item.variant && (
                                      <p className="font-body text-[11px] text-[#685c57] mt-0.5 uppercase tracking-wider font-bold">
                                        {item.variant}
                                      </p>
                                    )}
                                    <p className="font-display text-[14px] text-primary mt-1 font-bold">
                                      ₹{item.price?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 bg-surface p-1 rounded-full border border-outline-variant/10 shadow-sm h-9">
                                      {item.quantity > 1 ? (
                                        <button
                                          onClick={() =>
                                            updateQuantity(item.id, item.variant, item.quantity - 1)
                                          }
                                          className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center text-[#685c57] hover:bg-surface-container hover:text-primary transition-all cursor-pointer"
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
                                                id: item.id,
                                                variant: item.variant,
                                              })
                                            }
                                            className={`w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${confirmingRemove?.id === item.id && confirmingRemove?.variant === item.variant ? 'bg-error text-white shadow-md' : 'text-error/60 hover:bg-error/10 hover:text-error'}`}
                                            aria-label="Confirm remove"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">
                                              {confirmingRemove?.id === item.id &&
                                              confirmingRemove?.variant === item.variant
                                                ? 'check'
                                                : 'delete'}
                                            </span>
                                          </button>
                                          {confirmingRemove?.id === item.id &&
                                            confirmingRemove?.variant === item.variant && (
                                              <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1c1a] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-10 font-bold tracking-widest uppercase"
                                              >
                                                Confirm?
                                              </motion.div>
                                            )}
                                        </div>
                                      )}
                                      <span className="font-body text-[12px] w-5 text-center font-bold">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateQuantity(item.id, item.variant, item.quantity + 1)
                                        }
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#685c57] hover:bg-surface-container hover:text-primary transition-all cursor-pointer"
                                        aria-label="Increase quantity"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          add
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {confirmingRemove?.id === item.id &&
                                  confirmingRemove?.variant === item.variant && (
                                    <button
                                      onClick={() => {
                                        removeItem(item.id, item.variant);
                                        setConfirmingRemove(null);
                                      }}
                                      className="absolute inset-0 z-20 bg-error/95 text-white flex items-center justify-center gap-2 rounded-[20px] font-label text-[11px] uppercase tracking-widest font-bold shadow-inner"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        delete_forever
                                      </span>
                                      Confirm Removal
                                    </button>
                                  )}
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {items.filter((item) => item.type === 'rental').length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-[12px] font-bold uppercase tracking-widest text-[#685c57] border-b border-outline-variant/20 pb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          event_available
                        </span>
                        Rentals
                      </h4>
                      <div className="space-y-4">
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
                                  scale: 0.9,
                                  x: -30,
                                  transition: { duration: 0.2 },
                                }}
                                key={`${item.id}-${item.variant || ''}`}
                                className="relative flex gap-4 p-4 rounded-[20px] bg-[#fdfaf5] border border-[#d0c5af]/40 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                              >
                                <div className="w-20 h-24 rounded-[12px] overflow-hidden flex-shrink-0 bg-surface-container relative">
                                  <CloudinaryImage
                                    src={item.imageSrc || item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    containerClassName="w-full h-full"
                                    loading="lazy"
                                    width={160}
                                    height={192}
                                    sizes="80px"
                                  />
                                  <div className="absolute top-1 left-1 bg-[#8c7335] text-white text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Rent
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                    <h3 className="font-display text-[15px] leading-tight truncate">
                                      {item.title}
                                    </h3>
                                    {item.variant && (
                                      <p className="font-body text-[11px] text-[#685c57] mt-0.5 uppercase tracking-wider font-bold">
                                        {item.variant}
                                      </p>
                                    )}
                                    <p className="font-display text-[14px] text-primary mt-1 font-bold">
                                      ₹{item.price?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-outline-variant/10 shadow-sm h-9">
                                      {item.quantity > 1 ? (
                                        <button
                                          onClick={() =>
                                            updateQuantity(item.id, item.variant, item.quantity - 1)
                                          }
                                          className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center text-[#685c57] hover:bg-surface-container hover:text-primary transition-all cursor-pointer"
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
                                                id: item.id,
                                                variant: item.variant,
                                              })
                                            }
                                            className={`w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${confirmingRemove?.id === item.id && confirmingRemove?.variant === item.variant ? 'bg-error text-white shadow-md' : 'text-error/60 hover:bg-error/10 hover:text-error'}`}
                                            aria-label="Confirm remove"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">
                                              {confirmingRemove?.id === item.id &&
                                              confirmingRemove?.variant === item.variant
                                                ? 'check'
                                                : 'delete'}
                                            </span>
                                          </button>
                                          {confirmingRemove?.id === item.id &&
                                            confirmingRemove?.variant === item.variant && (
                                              <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1c1a] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-10 font-bold tracking-widest uppercase"
                                              >
                                                Confirm?
                                              </motion.div>
                                            )}
                                        </div>
                                      )}
                                      <span className="font-body text-[12px] w-5 text-center font-bold">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateQuantity(item.id, item.variant, item.quantity + 1)
                                        }
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#685c57] hover:bg-surface-container hover:text-primary transition-all cursor-pointer"
                                        aria-label="Increase quantity"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          add
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {confirmingRemove?.id === item.id &&
                                  confirmingRemove?.variant === item.variant && (
                                    <button
                                      onClick={() => {
                                        removeItem(item.id, item.variant);
                                        setConfirmingRemove(null);
                                      }}
                                      className="absolute inset-0 z-20 bg-error/95 text-white flex items-center justify-center gap-2 rounded-[20px] font-label text-[11px] uppercase tracking-widest font-bold shadow-inner"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        delete_forever
                                      </span>
                                      Confirm Removal
                                    </button>
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

            {/* Footer with Totals */}
            {items.length > 0 && (
              <div
                className="p-6 border-t border-outline-variant/10 space-y-3 bg-white"
                style={{
                  paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
                }}
              >
                <div className="flex justify-between items-center text-[14px]">
                  <span className="font-body text-secondary">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                {appliedCoupon && appliedCoupon.calculatedDiscount > 0 && (
                  <div className="flex justify-between items-center text-[14px] text-green-700 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-green-700">
                        local_activity
                      </span>
                      Discount ({appliedCoupon.code})
                    </span>
                    <span>− ₹{appliedCoupon.calculatedDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-[1px] bg-outline-variant/10 my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-body text-[14px] font-bold text-on-surface">
                    Estimated Total
                  </span>
                  <span className="font-display text-[20px] font-bold text-on-surface">
                    ₹{(subtotal - (appliedCoupon?.calculatedDiscount || 0)).toLocaleString()}
                  </span>
                </div>
                <p className="font-body text-[12px] text-secondary/60 font-light">
                  Shipping calculated at checkout
                </p>
                <Link
                  to="/checkout"
                  onMouseEnter={() => prefetchManager.prefetchRoute('/checkout', { kind: 'hover' })}
                  onClick={onClose}
                  className="block w-full bg-black text-white py-4 rounded-full font-label text-[12px] uppercase tracking-[0.3em] text-center hover:bg-[#8c7335] hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/15"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  to="/cart"
                  onClick={onClose}
                  className="block w-full text-center py-3 font-label text-[12px] uppercase tracking-widest text-secondary hover:text-primary transition-colors font-bold"
                >
                  View Full Bag
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
