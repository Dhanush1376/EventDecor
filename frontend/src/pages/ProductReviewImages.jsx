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

  useEffect(() => {
    const fetchAllReviews = async () => {
      setLoading(true);
      try {
        const res = await reviewService.getProductReviews(id, { page: 1, limit: 100 });
        if (res.success) {
          const list = res.data.items || res.data.data || res.data || [];
          setReviews(list);
        }
      } catch (err) {
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

  if (productLoading || (loading && photos.length === 0)) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-surface flex items-center justify-center">
        <div className="skeleton-box w-20 h-20 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen pt-28 pb-16">
      <SEO
        title={`Customer Gallery - ${product?.title || 'Artisanal Masterpiece'}`}
        description={`Browse customer submitted gallery images for ${product?.title}`}
      />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 font-label text-[11px] uppercase tracking-widest text-[#685c57] font-bold">
          <Link
            to={`/product/${id}`}
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to masterpiece
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-[#2d2b29] truncate font-bold">Customer Gallery</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-6">
          <div>
            <span className="font-label text-[10px] uppercase tracking-[0.35em] text-primary font-bold block mb-1">
              Customer Gallery
            </span>
            <h2 className="font-display text-2xl md:text-3xl text-black font-bold tracking-tight">
              Real Setup Inspiration
            </h2>
            {product && (
              <p className="font-body text-xs text-black/40 mt-1">
                Visual stories submitted by buyers of{' '}
                <span className="font-semibold text-black">{product.title}</span>
              </p>
            )}
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 md:p-6">
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
              className="relative w-full max-w-5xl h-full md:h-[80vh] bg-white rounded-t-[32px] md:rounded-[28px] overflow-hidden flex flex-col md:flex-row shadow-2xl z-[100000]"
            >
              {/* Image Column */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden h-[50vh] md:h-full group">
                <img
                  src={activePhoto.imgUrl}
                  alt="Customer Upload"
                  className="w-full h-full object-contain max-h-full"
                />

                {/* Left/Right Nav Indicators inside photo */}
                {activePhotoIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                )}
                {activePhotoIndex < photos.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-4 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                )}
              </div>

              {/* Review Context Details Column */}
              <div className="w-full md:w-[380px] bg-white flex flex-col p-6 overflow-y-auto max-h-[50vh] md:max-h-full shrink-0">
                {/* Close Button Header */}
                <div className="flex justify-between items-center pb-4 border-b border-black/5">
                  <h4 className="font-display font-bold text-lg text-black">celebration review</h4>
                  <button
                    onClick={() => setActivePhotoIndex(null)}
                    className="w-9 h-9 min-h-0 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-black">close</span>
                  </button>
                </div>

                {/* Reviewer Meta */}
                <div className="py-5 flex items-center gap-3 border-b border-black/5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="font-display text-primary text-sm font-bold">
                      {(activePhoto.review.customer?.name || activePhoto.review.customerName || 'C')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-body text-sm font-semibold text-black leading-tight">
                      {activePhoto.review.customer?.name ||
                        activePhoto.review.customerName ||
                        'Customer'}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activePhoto.review.verified && (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-100">
                          <span className="material-symbols-outlined text-[10px]">verified</span>
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating / Date */}
                <div className="py-4 flex justify-between items-center">
                  <StarRating value={activePhoto.review.rating} size={15} />
                  <span className="font-label text-[10px] text-black/30 font-medium">
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
                <div className="flex-1 mt-2">
                  <p className="font-body text-[13px] text-black/75 leading-relaxed whitespace-pre-line">
                    {activePhoto.review.comment}
                  </p>
                </div>

                {/* Related Masterpiece Info */}
                {product && (
                  <div className="mt-8 p-3 bg-neutral-50 rounded-2xl border border-black/5 flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-3xs">
                      <OptimizedImage
                        src={product.imageSrc}
                        alt={product.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-widest text-black/40 font-bold font-label">
                        masterpiece
                      </p>
                      <p className="text-[11px] font-semibold text-black truncate leading-tight mt-0.5">
                        {product.title}
                      </p>
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
