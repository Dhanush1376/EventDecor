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
                    className="absolute left-4 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="text-[20px]" strokeWidth={1.5} />
                  </button>
                )}
                {activePhotoIndex < photos.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="absolute right-4 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="text-[20px]" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {/* Review Context Details Column */}
              <div
                className={`w-full lg:w-[420px] bg-white/95 backdrop-blur-xl flex flex-col shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 rounded-t-[32px] lg:rounded-none lg:rounded-tr-[28px] lg:rounded-br-[28px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isMobileDrawerOpen
                    ? 'max-h-[60vh] lg:max-h-full p-8 pt-10 lg:pt-8 opacity-100 overflow-y-auto'
                    : 'max-h-0 lg:max-h-full p-0 lg:p-8 opacity-0 lg:opacity-100 overflow-hidden'
                }`}
              >
                {/* Mobile Drawer Drag Handle */}
                <div
                  className="lg:hidden absolute top-0 left-0 right-0 flex justify-center py-3 cursor-pointer"
                  onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                >
                  <div className="w-12 h-1.5 bg-neutral-300 rounded-full opacity-60"></div>
                </div>

                {/* Close Button Header */}
                <div className="flex justify-between items-center pb-6 border-b border-neutral-200/60">
                  <h4 className="font-display font-semibold text-[22px] tracking-tight text-neutral-800 capitalize">
                    {activePhoto.review.title || 'Customer Review'}
                  </h4>
                  <button
                    onClick={() => setActivePhotoIndex(null)}
                    className="w-10 h-10 min-h-0 rounded-full bg-neutral-100 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                  >
                    <X className="text-[20px] transition-colors" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Reviewer Meta */}
                <div className="py-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                    <span className="font-display text-primary text-base font-bold tracking-wider">
                      {(activePhoto.review.customer?.name || activePhoto.review.customerName || 'C')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h5 className="font-body text-base font-medium text-neutral-900 leading-tight">
                      {activePhoto.review.customer?.name ||
                        activePhoto.review.customerName ||
                        'Customer'}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      {activePhoto.review.verified && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-200/50 shadow-sm">
                          <BadgeCheck className="text-[12px]" strokeWidth={1.5} />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating / Date */}
                <div className="pb-4 flex justify-between items-center border-b border-neutral-200/60">
                  <div className="flex items-center gap-1.5 p-1.5 px-3 bg-yellow-50/50 rounded-full border border-yellow-100/50">
                    <StarRating value={activePhoto.review.rating} size={16} />
                  </div>
                  <span className="font-label text-[11px] text-neutral-400 font-medium tracking-wide">
                    {activePhoto.review.createdAt
                      ? new Date(activePhoto.review.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                  </span>
                </div>

                {/* Comment Text */}
                <div className="flex-1 mt-6 relative">
                  <Quote
                    className="absolute -top-2 -left-2 text-[40px] text-neutral-100 -z-10 select-none"
                    strokeWidth={1.5}
                  />
                  <p className="font-body text-[15px] text-neutral-700 leading-[1.8] whitespace-pre-line z-10 relative">
                    {activePhoto.review.comment}
                  </p>
                </div>

                {/* Related Masterpiece Info */}
                {product && (
                  <div className="mt-8 p-3 bg-white hover:bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center gap-3 shrink-0 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-neutral-100 relative">
                      <OptimizedImage
                        src={product.imageSrc}
                        alt={product.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-primary/80 font-bold font-label mb-0.5">
                        masterpiece
                      </p>
                      <p className="text-[13px] font-semibold text-neutral-800 truncate leading-tight group-hover:text-primary transition-colors">
                        {product.title}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <ArrowRight className="text-[16px]" strokeWidth={1.5} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
