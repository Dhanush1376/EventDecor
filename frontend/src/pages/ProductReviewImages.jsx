import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  BadgeCheck,
  Quote,
  ArrowRight,
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProductQueries';
import { reviewService } from '../services/domainServices';
import { SEO } from '../components/seo/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { m as motion, AnimatePresence } from 'framer-motion';

// Helper Star Component
function StarRating({ value = 0, max = 5, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#D4A853' : 'none'}
            stroke={filled ? '#D4A853' : '#d1c4a8'}
            strokeWidth="1.5"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

export function ProductReviewImages() {
  const { id } = useParams();
  const { data: product, isLoading: productLoading } = useProduct(id);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null); // index in the flat list of photos
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(true);

  // Reset drawer state when modal opens
  useEffect(() => {
    setIsMobileDrawerOpen(true);
  }, [activePhotoIndex]);

  useEffect(() => {
    const fetchAllReviews = async () => {
      setLoading(true);
      try {
        const res = await reviewService.getProductReviews(id, { page: 1, limit: 100 });
        if (res.success) {
          const list = res.data.items || res.data.data || res.data || [];
          setReviews(list);
        }
      } catch (_err) {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchAllReviews();
    }
  }, [id]);

  // Flatten reviews to extract all images with their respective review context
  const photos = useMemo(() => {
    const list = [];
    reviews.forEach((review) => {
      if (review.images && review.images.length > 0) {
        review.images.forEach((imgUrl) => {
          list.push({
            imgUrl,
            review,
          });
        });
      }
    });
    return list;
  }, [reviews]);

  const activePhoto = useMemo(() => {
    if (activePhotoIndex === null || activePhotoIndex < 0 || activePhotoIndex >= photos.length) {
      return null;
    }
    return photos[activePhotoIndex];
  }, [activePhotoIndex, photos]);

  const handleNext = () => {
    if (activePhotoIndex !== null && activePhotoIndex < photos.length - 1) {
      setActivePhotoIndex(activePhotoIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activePhotoIndex !== null && activePhotoIndex > 0) {
      setActivePhotoIndex(activePhotoIndex - 1);
    }
  };

  // Touch Swipe Handlers
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const isSwiping = React.useRef(false);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    isSwiping.current = false;
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;

    if (Math.abs(distance) > minSwipeDistance) {
      isSwiping.current = true; // Prevent drawer toggle on this tap
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  if (productLoading || (loading && photos.length === 0)) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-surface flex items-center justify-center">
        <div className="skeleton-box w-20 h-20 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen pt-16 sm:pt-20 pb-12">
      <SEO
        title={`Customer Gallery - ${product?.title || 'Artisanal Masterpiece'}`}
        description={`Browse customer submitted gallery images for ${product?.title}`}
      />

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop space-y-4 sm:space-y-5">
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-neutral-200/60 pb-3 sm:pb-4">
          <div>
            <Link
              to={`/product/${id}`}
              className="inline-flex items-center gap-1.5 font-label text-[9px] uppercase tracking-widest text-neutral-400 hover:text-primary transition-colors font-bold mb-1"
            >
              <ArrowLeft className="text-[13px]" strokeWidth={1.5} />
              Back to Product
            </Link>
            <h1 className="font-display text-xl sm:text-2xl text-neutral-900 font-semibold tracking-tight">
              Customer Gallery
            </h1>
            {product && (
              <p className="font-body text-xs sm:text-sm text-neutral-500 mt-0.5">
                Real setup photos of{' '}
                <span className="font-medium text-neutral-800">{product.title}</span>
              </p>
            )}
          </div>
          {photos.length > 0 && (
            <span className="font-label text-[10px] uppercase tracking-wider text-neutral-400 font-bold self-start sm:self-end">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Gallery Grid */}
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[28px] border border-black/5 shadow-xs">
            <span className="material-symbols-outlined text-[48px] text-primary/30 mb-4 animate-pulse">
              photo_library
            </span>
            <p className="font-display text-lg text-black/50 font-medium">No customer photos yet</p>
            <p className="font-body text-sm text-black/30 mt-1">
              Check back later when other buyers share their milestone setup photos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
                onClick={() => setActivePhotoIndex(index)}
                className="aspect-square rounded-2xl overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-zoom-in relative group"
              >
                <OptimizedImage
                  src={item.imgUrl}
                  alt={`Customer setup ${index + 1}`}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white text-[10px] font-bold uppercase tracking-wider truncate">
                    By {item.review.customer?.name || item.review.customerName || 'Customer'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal Carousel */}
      <AnimatePresence>
        {activePhoto && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 lg:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setActivePhotoIndex(null)}
            />

            {/* Lightbox Content Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl h-full lg:h-[80vh] bg-black lg:bg-white rounded-none lg:rounded-[28px] overflow-hidden flex flex-col lg:flex-row shadow-2xl z-[100000]"
            >
              {/* Image Column */}
              <div
                className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-0 group cursor-pointer"
                onClick={() => {
                  if (!isSwiping.current) setIsMobileDrawerOpen(!isMobileDrawerOpen);
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Floating Close Button on Image */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIndex(null);
                  }}
                  className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                  aria-label="Close viewer"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>

                <img
                  src={activePhoto.imgUrl}
                  alt="Customer Upload"
                  className="w-full h-full object-contain"
                />

                {/* Left/Right Nav Indicators inside photo */}
                {activePhotoIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    className="absolute left-3 sm:left-4 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer z-20"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                )}
                {activePhotoIndex < photos.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="absolute right-3 sm:right-4 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer z-20"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                )}
              </div>

              {/* Review Context Details Column */}
              <div
                className={`w-full lg:w-[400px] bg-white/95 backdrop-blur-xl flex flex-col shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] lg:shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 rounded-t-2xl sm:rounded-t-[28px] lg:rounded-none lg:rounded-tr-[28px] lg:rounded-br-[28px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] relative ${
                  isMobileDrawerOpen
                    ? 'max-h-[38vh] sm:max-h-[42vh] lg:max-h-full px-4 py-3 pt-5 sm:px-5 sm:py-4 sm:pt-6 lg:p-6 opacity-100 overflow-y-auto'
                    : 'max-h-0 lg:max-h-full p-0 lg:p-6 opacity-0 lg:opacity-100 overflow-hidden'
                }`}
              >
                {/* Mobile Drawer Drag Handle */}
                <div
                  className="lg:hidden absolute top-1 left-0 right-0 flex justify-center py-1 cursor-pointer"
                  onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                >
                  <div className="w-10 h-1 bg-neutral-300 rounded-full opacity-70"></div>
                </div>

                {/* Close Button Header */}
                <div className="flex justify-between items-center pb-2 sm:pb-2.5 lg:pb-3 border-b border-neutral-200/60">
                  <h4 className="font-display font-semibold text-sm sm:text-base lg:text-lg tracking-tight text-neutral-800 capitalize truncate pr-2">
                    {activePhoto.review.title || 'Customer Review'}
                  </h4>
                  <button
                    onClick={() => setActivePhotoIndex(null)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-100 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0"
                    aria-label="Close details"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Reviewer Meta & Rating Row */}
                <div className="py-2 sm:py-2.5 lg:py-3 flex items-center justify-between gap-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                      <span className="font-display text-primary text-[11px] sm:text-xs font-bold tracking-wider">
                        {(
                          activePhoto.review.customer?.name ||
                          activePhoto.review.customerName ||
                          'C'
                        )
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-body text-xs sm:text-sm font-semibold text-neutral-900 leading-tight truncate">
                          {activePhoto.review.customer?.name ||
                            activePhoto.review.customerName ||
                            'Customer'}
                        </h5>
                        {activePhoto.review.verified && (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full border border-emerald-200/50">
                            <BadgeCheck
                              className="w-2.5 h-2.5 text-emerald-600"
                              strokeWidth={1.5}
                            />
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="font-label text-[10px] text-neutral-400 font-medium tracking-wide block sm:hidden mt-0.5">
                        {activePhoto.review.createdAt
                          ? new Date(activePhoto.review.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Rating & Date (Right) */}
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-yellow-50/70 rounded-full border border-yellow-100/60">
                      <StarRating value={activePhoto.review.rating} size={11} />
                    </div>
                    <span className="font-label text-[10px] text-neutral-400 font-medium tracking-wide hidden sm:block">
                      {activePhoto.review.createdAt
                        ? new Date(activePhoto.review.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Comment Text */}
                {activePhoto.review.comment && (
                  <div className="mt-2 sm:mt-2.5 lg:mt-3 relative">
                    <Quote
                      className="absolute -top-1 -left-1 text-neutral-200/60 w-4 h-4 -z-10 select-none pointer-events-none"
                      strokeWidth={1.5}
                    />
                    <p className="font-body text-xs sm:text-[13px] lg:text-sm text-neutral-700 leading-relaxed whitespace-pre-line z-10 relative pl-3">
                      {activePhoto.review.comment}
                    </p>
                  </div>
                )}

                {/* Related Masterpiece Info */}
                {product && (
                  <Link
                    to={`/product/${id}`}
                    className="mt-2 sm:mt-2.5 lg:mt-3.5 p-2 sm:p-2.5 bg-neutral-50/80 hover:bg-neutral-100/80 rounded-xl sm:rounded-2xl border border-neutral-200/70 flex items-center gap-2.5 shrink-0 cursor-pointer transition-all duration-200 hover:shadow-2xs group"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden shrink-0 shadow-2xs border border-neutral-200/60 relative">
                      <OptimizedImage
                        src={product.imageSrc}
                        alt={product.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-primary font-bold font-label leading-none mb-0.5">
                        masterpiece
                      </p>
                      <p className="text-xs sm:text-[13px] font-semibold text-neutral-800 truncate leading-tight group-hover:text-primary transition-colors">
                        {product.title}
                      </p>
                    </div>
                    <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-white shadow-2xs flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                      <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                    </div>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
