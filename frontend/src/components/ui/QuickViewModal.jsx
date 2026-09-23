import { Star, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from './CloudinaryImage';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { createPortal } from 'react-dom';
import { useMobileDrawerEngine, DrawerDragHandle } from './drawer';
import toast from 'react-hot-toast';

export const QuickViewModal = ({ isOpen, onClose, product, onNext, onPrev, hasNext, hasPrev }) => {
  const [mounted, setMounted] = React.useState(false);
  const [isConverting, setIsConverting] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setIsConverting(false);
  }, [isOpen, product?._id, product?.id]);

  const productId = product?._id || product?.id;

  const handleConvertToDetails = React.useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (isConverting || !product) return;
      setIsConverting(true);
      const targetRoute =
        product.itemType === 'event' ? `/events/${productId}` : `/product/${productId}`;

      // Smooth transition: give the morph animation 220ms to expand into full screen
      setTimeout(() => {
        onClose();
        navigate(targetRoute, { state: { product, fromQuickView: true } });
      }, 220);
    },
    [isConverting, product, productId, onClose, navigate],
  );

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose: isConverting ? undefined : onClose,
    onExpand: handleConvertToDetails,
    expandThreshold: -40,
  });
  const modalRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);
  const detailsScrollRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const touchStartPos = React.useRef({ x: null, y: null });
  const touchEndPos = React.useRef({ x: null, y: null });
  const touchStartTarget = React.useRef(null);

  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem } = useCart();
  const { runProtectedAction } = useAuth();

  const handleWishlist = (e) => {
    e?.stopPropagation();
    if (!product) return;
    runProtectedAction(() => {
      toggleItem(product);
    });
  };

  const onTouchStart = (e) => {
    const t = e.targetTouches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchEndPos.current = { x: t.clientX, y: t.clientY };
    touchStartTarget.current = e.target;
  };

  const onTouchMove = (e) => {
    const t = e.targetTouches[0];
    touchEndPos.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEndHandler = () => {
    const start = touchStartPos.current;
    const end = touchEndPos.current;
    if (start.x === null || end.x === null || start.y === null || end.y === null) return;

    const deltaX = start.x - end.x;
    const deltaY = start.y - end.y;

    // Detect prominent swipe UP (scrolling up / pulling up on touch screen)
    if (deltaY > 45 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1) {
      const el = detailsScrollRef.current;
      if (el && touchStartTarget.current && el.contains(touchStartTarget.current)) {
        const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 15;
        if (canScrollDown) return;
      }
      handleConvertToDetails();
      return;
    }

    // Horizontal swipe for next / prev products
    const isLeftSwipe = deltaX > 50 && Math.abs(deltaX) > Math.abs(deltaY);
    const isRightSwipe = deltaX < -50 && Math.abs(deltaX) > Math.abs(deltaY);

    if (isLeftSwipe && onNext) {
      onNext();
    }
    if (isRightSwipe && onPrev) {
      onPrev();
    }
  };

  const handleWheel = (e) => {
    if (isConverting) return;
    const el = detailsScrollRef.current;
    if (el && el.contains(e.target)) {
      const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 15;
      if (canScrollDown) {
        return;
      }
    }
    // Scrolling wheel downwards (reaching past quickview content to full details)
    if (e.deltaY > 35) {
      handleConvertToDetails(e);
    }
  };

  const handleAddToCart = (e) => {
    e?.stopPropagation();
    if (!product) return;
    if (product.itemType === 'event') {
      onClose();
      navigate(`/events/${product._id || product.id}`);
      return;
    }
    addItem({
      id: product._id || product.id,
      title: product.title,
      price: product.price,
      imageSrc: product.imageSrc,
      quantity: 1,
      variant: 'Default',
    });
    onClose();
    toast.success('Added to Bag!');
  };

  const handleScroll = (e) => {
    if (!e.target) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      document.body.classList.add('quickview-active');

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
              }
            }
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.classList.remove('quickview-active');
        if (triggerElementRef.current) {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!product) return null;

  const wishlisted = isWishlisted(productId);

  const handleViewDetails = (e) => {
    handleConvertToDetails(e);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 sm:p-4 lg:p-8 pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isConverting ? undefined : onClose}
            className={`fixed inset-0 pointer-events-auto transition-colors duration-200 ${
              isConverting
                ? 'bg-surface'
                : 'bg-on-surface-variant/40 backdrop-blur-xl cursor-pointer'
            }`}
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.96, y: isMobile ? '100%' : 20 }}
            animate={
              isConverting
                ? {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    borderRadius: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.96, y: isMobile ? '100%' : 20 }}
            transition={sheetTransition}
            {...(!isConverting ? dragProps : {})}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            className={`pointer-events-auto relative w-full bg-surface shadow-2xl flex flex-col lg:flex-row border border-outline-variant/10 overflow-hidden transition-all duration-200 ${
              isConverting
                ? '!fixed !inset-0 !z-[300] !max-w-none !max-h-none !h-screen !rounded-none !m-0 !p-0 shadow-none'
                : 'max-w-[440px] sm:max-w-[480px] lg:max-w-5xl rounded-t-3xl sm:rounded-[24px] lg:rounded-[32px] h-auto max-h-[90dvh] sm:max-h-[85vh]'
            }`}
          >
            {/* Top conversion progress bar */}
            {isConverting && (
              <div className="absolute inset-x-0 top-0 z-[100] h-1 bg-primary/20 overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="h-full w-full bg-primary"
                />
              </div>
            )}

            {isMobile && <DrawerDragHandle onClick={onClose} />}

            {/* Close Button - Fixed in Modal Container */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-8 lg:right-8 w-10 h-10 lg:w-12 lg:h-12 min-h-0 rounded-full border border-outline-variant/30 bg-surface/80 backdrop-blur-md flex items-center justify-center hover:bg-surface-container-low transition-colors cursor-pointer z-[60] shadow-sm icon-button-touch-target"
              aria-label="Close product quick view"
            >
              <span className="material-symbols-outlined text-[20px] lg:text-[24px] text-on-surface">
                close
              </span>
            </button>

            {/* Ratings Badge - Fixed in Modal Container, matching Close button height/alignment */}
            {(product.reviews > 0 || product.rating > 0) && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 lg:top-8 lg:left-8 h-10 lg:h-12 min-h-0 z-[60] flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 lg:px-4 rounded-full shadow-sm border border-black/5 pointer-events-auto">
                <Star className="text-[12px] lg:text-[14px] text-primary" strokeWidth={1.5} />
                <span className="font-label text-[10px] lg:text-[11px] text-black/60 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="text-black font-bold">
                    {Number(product.rating || 0).toFixed(1)}
                  </span>
                  <span className="text-black/30 font-normal">·</span>
                  <span>{product.reviews || 0} Reviews</span>
                </span>
              </div>
            )}

            <motion.div
              key={productId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col lg:flex-row w-full h-full"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEndHandler}
            >
              <div className="w-full lg:w-1/2 p-2 sm:p-3 lg:p-8 lg:pr-4 shrink-0 flex flex-col gap-3 lg:gap-4">
                <div className="relative bg-surface-container-low overflow-hidden rounded-[16px] lg:rounded-[24px] aspect-[4/5] sm:aspect-[4/5] lg:aspect-auto lg:h-[540px] w-full group shadow-sm border border-black/5 shrink-0">
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                  >
                    {(product.images && product.images.length > 0
                      ? product.images
                      : [product.imageSrc]
                    ).map((img, idx) => (
                      <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                        <CloudinaryImage
                          src={img}
                          alt={`${product.title} - view ${idx + 1}`}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                          loading={idx === 0 ? 'eager' : 'lazy'}
                          width={600}
                          height={600}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  {onPrev && hasPrev !== false && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrev();
                      }}
                      className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-black/80 hover:scale-110 active:scale-95 transition-all z-[50]"
                      aria-label="Previous product"
                    >
                      <ChevronLeft
                        className="text-[16px] lg:text-[20px] drop-shadow-md"
                        strokeWidth={1.5}
                      />
                    </button>
                  )}

                  {onNext && hasNext !== false && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNext();
                      }}
                      className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-black/80 hover:scale-110 active:scale-95 transition-all z-[50]"
                      aria-label="Next product"
                    >
                      <ChevronRight
                        className="text-[16px] lg:text-[20px] drop-shadow-md"
                        strokeWidth={1.5}
                      />
                    </button>
                  )}

                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-4 w-full flex justify-center gap-2 pointer-events-auto z-10">
                      {product.images.map((_, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (scrollContainerRef.current) {
                              scrollContainerRef.current.scrollTo({
                                left: idx * scrollContainerRef.current.clientWidth,
                                behavior: 'smooth',
                              });
                            }
                          }}
                          className={`cursor-pointer pointer-events-auto transition-all duration-300 rounded-full shadow-md border border-black/10 ${
                            idx === activeIndex
                              ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white'
                              : 'w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white/60 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Floating Icon Actions */}
                  <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-20 flex flex-col gap-2 pointer-events-auto">
                    <button
                      onClick={handleWishlist}
                      className="w-8 h-8 lg:w-9 lg:h-9 min-h-0 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border border-black/5 hover:scale-110 active:scale-95 transition-all cursor-pointer group shrink-0 aspect-square"
                      aria-label={wishlisted ? 'Saved' : 'Save'}
                      title={wishlisted ? 'Saved' : 'Save'}
                    >
                      <motion.span
                        animate={{
                          scale: wishlisted ? [1, 1.3, 1] : 1,
                          color: wishlisted ? '#ff2d55' : 'inherit',
                        }}
                        whileTap={{ scale: 0.8 }}
                        transition={{
                          duration: 0.3,
                          type: 'spring',
                          stiffness: 300,
                        }}
                        className="material-symbols-outlined text-[16px] transition-transform group-hover:scale-110 text-black/80"
                        style={{
                          fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </motion.span>
                    </button>

                    <button
                      onClick={handleViewDetails}
                      className="w-8 h-8 lg:w-9 lg:h-9 min-h-0 bg-white/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border border-black/5 hover:scale-110 active:scale-95 transition-all cursor-pointer group shrink-0 aspect-square"
                      aria-label="View Details"
                      title="View Details"
                    >
                      <ArrowRight
                        className="text-[16px] group-hover:-rotate-45 transition-transform text-black/80"
                        strokeWidth={1.5}
                      />
                    </button>

                    <button
                      onClick={handleAddToCart}
                      className="w-8 h-8 lg:w-9 lg:h-9 min-h-0 bg-black text-white rounded-full flex items-center justify-center shadow-lg border border-black/5 hover:scale-110 active:scale-95 transition-all cursor-pointer shrink-0 aspect-square"
                      aria-label={product.itemType === 'event' ? 'Book Setup' : 'Add to Collection'}
                      title={product.itemType === 'event' ? 'Book Setup' : 'Add to Collection'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {product.itemType === 'event' ? 'event' : 'shopping_bag'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Thumbnails Row */}
                {product.images && product.images.length > 1 && (
                  <div className="flex w-full gap-2 lg:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 px-1">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTo({
                              left: idx * scrollContainerRef.current.clientWidth,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        className={`relative flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-md lg:rounded-lg overflow-hidden snap-center transition-all ${
                          idx === activeIndex
                            ? 'border border-black/40 shadow-sm scale-100 opacity-100'
                            : 'border border-outline-variant/30 scale-95 opacity-60 hover:opacity-100 hover:scale-100'
                        }`}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <CloudinaryImage
                          src={img}
                          alt={`${product.title} - view ${idx + 1}`}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                          loading="lazy"
                          width={200}
                          height={200}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                ref={detailsScrollRef}
                className="w-full lg:w-1/2 p-4 sm:p-5 lg:p-8 pb-8 sm:pb-10 lg:pb-12 flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar relative"
              >
                {(product.teluguTitle || product.nameTE || product.teluguName) && (
                  <span className="block font-label text-[9px] lg:text-[11px] text-on-surface/40 mb-0.5 tracking-wider uppercase font-bold leading-tight line-clamp-1">
                    {product.teluguTitle || product.nameTE || product.teluguName}
                  </span>
                )}
                <h2
                  id="quickview-title"
                  onClick={handleViewDetails}
                  className="font-headline text-[18px] sm:text-[20px] lg:text-[28px] text-on-surface mb-1.5 lg:mb-3 font-medium leading-tight line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                  title="Click to view full product details"
                >
                  {product.title}
                </h2>

                <div className="flex items-baseline gap-2.5 mb-2 sm:mb-3">
                  <span className="font-display lining-nums font-bold text-[22px] sm:text-[24px] lg:text-[32px] text-on-surface">
                    ₹
                    {(product.itemType === 'event'
                      ? product.rentalPrice || product.price
                      : product.availabilityMode === 'rent_only' &&
                          product.rentalPricing?.rentalPrice
                        ? product.rentalPricing.rentalPrice
                        : product.price
                    )?.toLocaleString('en-IN') || '0'}
                    {product.availabilityMode === 'rent_only' &&
                      product.rentalPricing?.rentalPrice > 0 && (
                        <span className="font-label text-[11px] sm:text-[12px] text-on-surface-variant/60 ml-1.5 font-bold">
                          {`for up to ${product.rentalPricing.rentalDurationDays || 1} ${(product.rentalPricing.rentalDurationDays || 1) === 1 ? 'day' : 'days'}`}
                        </span>
                      )}
                  </span>
                  {product.itemType !== 'event' && product.oldPrice && (
                    <span className="font-display lining-nums text-on-surface-variant/40 line-through text-[15px] lg:text-[18px]">
                      ₹{product.oldPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Pull / Scroll Up Affordance Bar */}
                <div
                  onClick={handleConvertToDetails}
                  className="w-full my-2 sm:my-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-surface-container-low/70 hover:bg-surface-container-low border border-outline-variant/20 flex items-center justify-between transition-all cursor-pointer group shadow-2xs hover:shadow-xs select-none"
                  title="Scroll or pull up for full product details"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <motion.span
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                        className="material-symbols-outlined text-[15px] sm:text-[17px]"
                      >
                        keyboard_double_arrow_up
                      </motion.span>
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-label text-[10.5px] sm:text-[11.5px] font-bold text-on-surface tracking-wide uppercase truncate">
                        Scroll Up for Full Details
                      </span>
                      <span className="text-[9.5px] sm:text-[10px] text-on-surface-variant/70 font-normal truncate">
                        Specs, reviews & customization
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-on-surface-variant/60 group-hover:translate-x-1 group-hover:text-primary transition-all shrink-0 ml-2"
                    strokeWidth={2}
                  />
                </div>

                <div className="mt-auto hidden lg:block space-y-4 pb-[max(16px,var(--safe-area-bottom,_env(safe-area-inset-bottom)))] lg:pb-0">
                  <button
                    onClick={handleAddToCart}
                    className="w-full btn-primary !py-4 md:!py-5 flex items-center justify-center gap-3 font-bold cursor-pointer shadow-lg hover:scale-[1.02] transition-transform"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {product.itemType === 'event' ? 'event' : 'shopping_bag'}
                    </span>
                    {product.itemType === 'event' ? 'Book Setup' : 'Add to Collection'}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleWishlist}
                      className="flex items-center justify-center gap-2 py-3 lg:py-4 rounded-full border border-outline-variant/30 font-label text-[10px] lg:text-[11px] uppercase tracking-widest font-bold hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
                      <motion.span
                        animate={{
                          scale: wishlisted ? [1, 1.3, 1] : 1,
                          color: wishlisted ? '#ff2d55' : 'inherit',
                        }}
                        whileTap={{ scale: 0.8 }}
                        transition={{
                          duration: 0.3,
                          type: 'spring',
                          stiffness: 300,
                        }}
                        className="material-symbols-outlined text-[18px] lg:text-[20px] transition-transform group-hover:scale-110"
                        style={{
                          fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </motion.span>
                      {wishlisted ? 'Saved' : 'Save'}
                    </button>
                    <button
                      onClick={handleViewDetails}
                      className="flex items-center justify-center gap-2 py-3 lg:py-4 rounded-full border border-outline-variant/30 font-label text-[10px] lg:text-[11px] uppercase tracking-widest font-bold hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
                      <ArrowRight
                        className="text-[18px] lg:text-[20px] group-hover:translate-x-1 transition-transform"
                        strokeWidth={1.5}
                      />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
