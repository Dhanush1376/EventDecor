import {
  ShoppingBag,
  Palette,
  Trash2,
  ArrowLeft,
  Plus,
  Minus,
  Image,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../ui';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import React, { useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { useActiveCoupons } from '../../hooks/useActiveCoupons';
import { useScrollLock } from '../../hooks/useScrollLock';

const getItemImage = (item) => {
  const candidate =
    item.imageSrc ||
    item.image ||
    item.product?.imageSrc ||
    (Array.isArray(item.product?.images) && item.product.images[0]) ||
    item.product?.image ||
    (Array.isArray(item.images) && item.images[0]);
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate;
  if (typeof candidate === 'object')
    return candidate.url || candidate.secure_url || candidate.src || '';
  return '';
};

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
    activeCartMode,
  } = useCart();

  const isRentalMode =
    activeCartMode === 'rental' || (items.length > 0 && items.every((i) => i.type === 'rental'));
  const navigate = useNavigate();
  const { data: activeCoupons = [] } = useActiveCoupons();

  const [confirmingRemove, setConfirmingRemove] = React.useState(null);

  const drawerCoupons = activeCoupons.filter((c) => c.displayLocations?.includes('cart_drawer'));

  const drawerRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;

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
            className="fixed right-0 top-0 w-full max-w-[calc(100vw-32px)] sm:max-w-[440px] h-[100dvh] bg-white/95 backdrop-blur-2xl z-[210] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.08)] touch-pan-y border-l border-white/60 modern-sans-headings font-body keyboard-safari-fix"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-black/[0.06] bg-white/70 sticky top-0 z-10 backdrop-blur-md">
              <button
                onClick={onClose}
                className="group flex items-center gap-3 shrink-0 cursor-pointer"
                aria-label="Close cart"
              >
                <ArrowLeft
                  className="text-[22px] text-[#1a1a1a] group-hover:-translate-x-1 transition-transform"
                  strokeWidth={1.5}
                />
                <span
                  className="font-label text-[13px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] leading-none pt-0.5"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Cart
                </span>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary/10 text-primary text-[12px] font-bold px-2.5 py-0.5 rounded-full shadow-sm ml-1"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-5 pt-3.5 pb-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-black/10 hover:scrollbar-thumb-black/20">
              {loading && items.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: Math.max(1, cartCount || 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-3.5 rounded-2xl border border-black/[0.03] bg-white/50 animate-pulse shadow-sm"
                    >
                      <div className="w-[82px] h-[100px] rounded-[14px] bg-black/5" />
                      <div className="flex-1 py-1.5 space-y-3">
                        <div className="h-4 bg-black/5 rounded w-3/4" />
                        <div className="h-3 bg-black/5 rounded w-1/2" />
                        <div className="h-5 bg-black/5 rounded w-1/3 mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <EmptyState
                    title="Your bag is empty"
                    description="Discover our curated pieces and start building your dream event."
                    icon="shopping_bag"
                    actionLabel="Explore Collections"
                    onAction={() => {
                      onClose();
                      navigate('/collections');
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {items.filter((item) => item.type === 'purchase').length > 0 && (
                    <div className="space-y-3">
                      <div
                        className="font-label text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] flex items-center gap-2 ml-0.5"
                        style={{ fontFamily: 'var(--font-label)' }}
                      >
                        <ShoppingBag className="text-[14px] text-primary" strokeWidth={1.8} />
                        <span>Purchases</span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type === 'purchase')
                            .map((item) => {
                              const itemImage = getItemImage(item);
                              return (
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
                                  className="relative flex gap-4 p-3.5 rounded-2xl bg-gradient-to-br from-white to-[#fafafa] border border-black/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group"
                                >
                                  <div className="w-[82px] h-[100px] rounded-[14px] overflow-hidden flex-shrink-0 bg-[#f5f5f5] relative shadow-inner border border-black/[0.03]">
                                    {itemImage ? (
                                      <CloudinaryImage
                                        src={itemImage}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        containerClassName="w-full h-full"
                                        eager
                                        skipObserver
                                        loading="eager"
                                        width={164}
                                        height={200}
                                        sizes="82px"
                                        quality="auto:good"
                                        fallback={
                                          <div className="w-full h-full flex items-center justify-center opacity-30 bg-black/5">
                                            <Image className="text-[26px]" strokeWidth={1.5} />
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center opacity-20 bg-black/5">
                                        <Image className="text-[26px]" strokeWidth={1.5} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div>
                                      <p
                                        className="font-body text-[14px] font-semibold leading-snug text-[#1a1a1a] truncate group-hover:text-primary transition-colors"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        {item.title}
                                      </p>
                                      {item.variant && (
                                        <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                          {item.variant}
                                        </p>
                                      )}
                                      <p
                                        className="font-body text-[14px] text-[#1a1a1a] mt-1.5 font-bold"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
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
                                            <Minus className="text-[16px]" strokeWidth={1.5} />
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
                                          <Plus className="text-[16px]" strokeWidth={1.5} />
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
                                        <Trash2 className="text-[24px] mb-1" strokeWidth={1.5} />
                                        Tap to remove
                                      </motion.button>
                                    )}
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {items.filter((item) => item.type === 'custom').length > 0 && (
                    <div className="space-y-3">
                      <div
                        className="font-label text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] flex items-center gap-2 ml-0.5"
                        style={{ fontFamily: 'var(--font-label)' }}
                      >
                        <Palette className="text-[14px] text-primary" strokeWidth={1.8} />
                        <span>Custom Orders</span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type === 'custom')
                            .map((item) => {
                              const itemImage = getItemImage(item);
                              return (
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
                                  className="relative flex gap-4 p-3.5 rounded-2xl bg-gradient-to-br from-[#faf8f2] to-[#f5f1e6] border border-[#b38235]/15 shadow-[0_2px_12px_rgba(179,130,53,0.05)] hover:shadow-[0_8px_24px_rgba(179,130,53,0.1)] hover:-translate-y-0.5 transition-all duration-300 group"
                                >
                                  <div className="w-[82px] h-[100px] rounded-[14px] overflow-hidden flex-shrink-0 bg-[#eeeade] relative shadow-inner border border-black/[0.03]">
                                    {itemImage ? (
                                      <CloudinaryImage
                                        src={itemImage}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        containerClassName="w-full h-full"
                                        eager
                                        skipObserver
                                        loading="eager"
                                        width={164}
                                        height={200}
                                        sizes="82px"
                                        quality="auto:good"
                                        fallback={
                                          <div className="w-full h-full flex items-center justify-center opacity-30 bg-black/5">
                                            <Image className="text-[26px]" strokeWidth={1.5} />
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center opacity-20 bg-black/5">
                                        <Image className="text-[26px]" strokeWidth={1.5} />
                                      </div>
                                    )}
                                    <div className="absolute top-1.5 left-1.5 bg-[#b38235] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md z-10">
                                      Custom
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div>
                                      <p
                                        className="font-body text-[14px] font-semibold leading-snug text-[#1a1a1a] truncate group-hover:text-[#b38235] transition-colors"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        {item.title || 'Custom Order'}
                                      </p>
                                      {item.variant && (
                                        <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                          {item.variant}
                                        </p>
                                      )}
                                      <p
                                        className="font-body text-[14px] text-[#1a1a1a] mt-1.5 font-bold"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
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
                                        <Trash2 className="text-[24px] mb-1" strokeWidth={1.5} />
                                        Tap to remove
                                      </motion.button>
                                    )}
                                </motion.div>
                              );
                            })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {items.filter((item) => item.type === 'rental').length > 0 && (
                    <div className="space-y-3">
                      <div
                        className="font-label text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] flex items-center gap-2 ml-0.5"
                        style={{ fontFamily: 'var(--font-label)' }}
                      >
                        <CalendarCheck className="text-[14px] text-primary" strokeWidth={1.8} />
                        <span>Rentals</span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {items
                            .filter((item) => item.type === 'rental')
                            .map((item) => {
                              const itemImage = getItemImage(item);
                              return (
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
                                  className="relative flex gap-4 p-3.5 rounded-2xl bg-gradient-to-br from-[#faf8f2] to-[#f5f1e6] border border-primary/20 shadow-[0_2px_12px_rgba(115,92,0,0.05)] hover:shadow-[0_8px_24px_rgba(115,92,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 group"
                                >
                                  <div className="w-[82px] h-[100px] rounded-[14px] overflow-hidden flex-shrink-0 bg-[#eeeade] relative shadow-inner border border-black/[0.03]">
                                    {itemImage ? (
                                      <CloudinaryImage
                                        src={itemImage}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        containerClassName="w-full h-full"
                                        eager
                                        skipObserver
                                        loading="eager"
                                        width={164}
                                        height={200}
                                        sizes="82px"
                                        quality="auto:good"
                                        fallback={
                                          <div className="w-full h-full flex items-center justify-center opacity-30 bg-black/5">
                                            <Image className="text-[26px]" strokeWidth={1.5} />
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center opacity-20 bg-black/5">
                                        <Image className="text-[26px]" strokeWidth={1.5} />
                                      </div>
                                    )}
                                    <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md z-10">
                                      Rent
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div>
                                      <p
                                        className="font-body text-[14px] font-semibold leading-snug text-[#1a1a1a] truncate group-hover:text-primary transition-colors"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        {item.title}
                                      </p>
                                      {item.variant && (
                                        <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                          {item.variant}
                                        </p>
                                      )}
                                      <p
                                        className="font-body text-[14px] text-[#1a1a1a] mt-1.5 font-bold"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        ₹{item.price?.toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                      <div className="flex items-center gap-1.5 bg-white shadow-sm border border-primary/20 px-1.5 py-1 rounded-full h-9">
                                        {item.quantity > 1 ? (
                                          <button
                                            onClick={() =>
                                              updateQuantity(
                                                item.id || item._id,
                                                item.variant,
                                                item.quantity - 1,
                                              )
                                            }
                                            className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center text-black/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer active:scale-95"
                                            aria-label="Decrease quantity"
                                          >
                                            <Minus className="text-[16px]" strokeWidth={1.5} />
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
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-black/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer active:scale-95"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus className="text-[16px]" strokeWidth={1.5} />
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
                                        <Trash2 className="text-[24px] mb-1" strokeWidth={1.5} />
                                        Tap to remove
                                      </motion.button>
                                    )}
                                </motion.div>
                              );
                            })}
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
                style={{
                  paddingBottom: `calc(12px + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))`,
                }}
              >
                {/* Promotions Panel */}
                {drawerCoupons.length > 0 && !appliedCoupon && (
                  <div className="mb-2 -mx-4 px-4">
                    <div
                      className="font-label text-[9px] uppercase tracking-[0.18em] text-black/40 font-bold mb-1.5"
                      style={{ fontFamily: 'var(--font-label)' }}
                    >
                      Available Offers
                    </div>
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
                  <span
                    className="font-body font-bold text-[#1a1a1a]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
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
                  <span
                    className="font-body text-[18px] leading-none font-bold text-[#1a1a1a]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
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
                    state={{
                      checkoutMode: isRentalMode ? 'rental' : activeCartMode,
                      couponCode: appliedCoupon?.code,
                    }}
                    onMouseEnter={() =>
                      prefetchManager.prefetchRoute('/checkout', { kind: 'hover' })
                    }
                    onClick={onClose}
                    className="flex-[1.5] relative overflow-hidden block bg-[#1a1a1a] text-white py-2.5 rounded-full font-label text-[10px] uppercase tracking-[0.15em] text-center hover:bg-black active:scale-[0.98] transition-all duration-300 shadow-sm font-bold group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      {isRentalMode
                        ? 'Rent'
                        : activeCartMode === 'custom'
                          ? 'Custom Order'
                          : 'Checkout'}
                      <ArrowRight
                        className="text-[14px] group-hover:translate-x-1 transition-transform duration-300"
                        strokeWidth={1.5}
                      />
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
