import { X, Star, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from './CloudinaryImage';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export const QuickViewModal = ({ isOpen, onClose, product, onNext, onPrev, hasNext, hasPrev }) => {
  const modalRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);
  const navigate = useNavigate();

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
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && onNext) {
      onNext();
    }
    if (isRightSwipe && onPrev) {
      onPrev();
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
      document.body.style.overflow = 'hidden';
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
        document.body.style.overflow = '';
        document.body.classList.remove('quickview-active');
        if (triggerElementRef.current) {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!product) return null;

  const productId = product._id || product.id;
  const wishlisted = isWishlisted(productId);

  const handleViewDetails = (e) => {
    e?.stopPropagation();
    onClose();
    navigate(product.itemType === 'event' ? `/events/${productId}` : `/product/${productId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-3 sm:p-4 lg:p-8 pb-[max(16px,env(safe-area-inset-bottom))] lg:pb-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface-variant/40 backdrop-blur-xl"
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            style={{ willChange: 'transform, opacity' }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 150 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 400) {
                onClose();
              }
            }}
            className="relative w-full max-w-[440px] sm:max-w-[480px] lg:max-w-5xl bg-surface rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-auto max-h-[85vh] border border-outline-variant/10 touch-pan-x"
          >
            {/* Close Button - Fixed in Modal Container */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 lg:top-8 lg:right-8 w-9 h-9 lg:w-12 lg:h-12 min-h-0 rounded-full border border-outline-variant/30 bg-surface/80 backdrop-blur-md flex items-center justify-center hover:bg-surface-container-low transition-colors cursor-pointer z-[60] shadow-sm icon-button-touch-target"
              aria-label="Close product quick view"
            >
              <X className="text-[18px] lg:text-[24px]" strokeWidth={1.5} />
            </button>

            {/* Ratings Badge - Fixed in Modal Container, matching Close button height/alignment */}
            {(product.reviews > 0 || product.rating > 0) && (
              <div className="absolute top-4 left-4 lg:top-8 lg:left-8 h-9 lg:h-12 min-h-0 z-[60] flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 lg:px-4 rounded-full shadow-sm border border-black/5 pointer-events-auto">
                <Star className="text-[12px] lg:text-[14px] text-primary" strokeWidth={1.5} />
                <span className="font-label text-[10px] lg:text-[11px] text-black/60 font-bold uppercase tracking-wider flex items-center">
                  <span className="text-black font-bold mr-1">
                    {Number(product.rating || 0).toFixed(1)}
                  </span>
                  ({product.reviews || 0} Reviews)
                </span>
              </div>
            )}

            <motion.div
              key={productId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col lg:flex-row w-full h-full cursor-pointer"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEndHandler}
              onClick={handleViewDetails}
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

              <div className="w-full lg:w-1/2 p-4 sm:p-5 lg:p-8 pb-8 sm:pb-10 lg:pb-12 flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
                {(product.teluguTitle || product.nameTE || product.teluguName) && (
                  <span className="block font-label text-[9px] lg:text-[11px] text-on-surface/40 mb-0.5 tracking-wider uppercase font-bold leading-tight line-clamp-1">
                    {product.teluguTitle || product.nameTE || product.teluguName}
                  </span>
                )}
                <h2
                  id="quickview-title"
                  className="font-headline text-[18px] sm:text-[20px] lg:text-[28px] text-on-surface mb-1.5 lg:mb-3 font-medium leading-tight line-clamp-2"
                >
                  {product.title}
                </h2>

                <div className="flex items-baseline gap-2.5 mb-4 lg:mb-6">
                  <span className="font-display lining-nums font-bold text-[22px] sm:text-[24px] lg:text-[32px] text-on-surface">
                    ₹
                    {(product.itemType === 'event'
                      ? product.rentalPrice || product.price
                      : product.price
                    )?.toLocaleString('en-IN') || '0'}
                    {product.itemType === 'event' && (
                      <span className="font-label text-[10px] sm:text-[11px] text-on-surface-variant/60 ml-1">
                        / day
                      </span>
                    )}
                  </span>
                  {product.itemType !== 'event' && product.oldPrice && (
                    <span className="font-display lining-nums text-on-surface-variant/40 line-through text-[15px] lg:text-[18px]">
                      ₹{product.oldPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="mt-auto hidden lg:block space-y-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:pb-0">
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
    </AnimatePresence>
  );
};
