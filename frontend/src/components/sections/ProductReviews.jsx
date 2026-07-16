import { m as motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { reviewService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { uploadService } from '../../services/api/uploadService';
import { LoadingButton } from '../ui/LoadingButton';

// ─── Star Component ─────────────────────────────────────────────────────────
function StarRating({ value = 0, max = 5, interactive = false, size = 20, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? hovered || value : value;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(display);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            onMouseEnter={() => interactive && setHovered(i + 1)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
            aria-label={`${i + 1} star${i !== 0 ? 's' : ''}`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? '#D4A853' : 'none'}
              stroke={filled ? '#D4A853' : '#d1c4a8'}
              strokeWidth="1.5"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Review Name Helper ──────────────────────────────────────────────────────
export function getPremiumReviewerName(review) {
  return review.customer?.name || review.customerName || 'Anonymous Customer';
}

// ─── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ review, productId }) {
  const customerName = getPremiumReviewerName(review);
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="bg-[#FAFAF9] rounded-[24px] p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="font-display text-primary text-xs font-bold">{initials}</span>
            </div>
            <div>
              <p className="font-body text-xs font-semibold text-black leading-tight">
                {customerName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {review.verified && (
                  <span className="inline-flex items-center gap-0.5 bg-green-50 text-green-700 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-green-100">
                    <span className="material-symbols-outlined text-[9px]">verified</span>
                    Verified Purchase
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="font-label text-[9px] text-black/30 font-medium shrink-0">{date}</span>
        </div>

        <StarRating value={review.rating} size={12} />

        {review.comment && (
          <p className="font-body text-xs text-black/70 leading-relaxed mt-2.5 line-clamp-3">
            {review.comment}
          </p>
        )}
      </div>

      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-black/5">
          {review.images.slice(0, 3).map((imgUrl, idx) => (
            <Link
              key={idx}
              to={`/product/${productId}/reviews/images`}
              className="w-10 h-10 rounded-xl overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group flex-shrink-0"
            >
              <OptimizedImage
                src={imgUrl}
                alt={`Review photo ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </Link>
          ))}
          {review.reviewImages && review.reviewImages.length > 3 ? (
            <Link
              to={`/product/${productId}/reviews/images`}
              className="w-10 h-10 rounded-xl overflow-hidden border border-black/5 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-[9px] font-bold tracking-widest flex-shrink-0 transition-colors cursor-pointer"
            >
              +{review.reviewImages.length - 3}
            </Link>
          ) : (
            review.images &&
            review.images.length > 3 && (
              <Link
                to={`/product/${productId}/reviews/images`}
                className="w-10 h-10 rounded-xl overflow-hidden border border-black/5 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-[9px] font-bold tracking-widest flex-shrink-0 transition-colors cursor-pointer"
              >
                +{review.images.length - 3}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Write Review Drawer ───────────────────────────────────────────────────────
export function WriteReviewModal({ productId, productTitle, onClose, onSuccess, existingReview }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [remoteImages, setRemoteImages] = useState(
    existingReview?.reviewImages ||
      (existingReview?.images ? existingReview.images.map((url) => ({ secureUrl: url })) : []),
  );
  const [localPreviews, setLocalPreviews] = useState([]);
  const combinedPreviews = [...remoteImages.map((img) => img.secureUrl), ...localPreviews];
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const userInitials = (user?.name || 'Customer')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Please select a star rating.');
    if (comment.trim().length < 10) return toast.error('Please write at least 10 characters.');

    setSubmitting(true);
    try {
      let newReviewImages = [];
      if (selectedFiles.length > 0) {
        toast.loading('Compressing and uploading review images...', { id: 'review-upload' });
        const formData = new FormData();

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };

        for (const file of selectedFiles) {
          try {
            const compressedFile = await imageCompression(file, options);
            formData.append('images', compressedFile, file.name);
          } catch (error) {
            console.error('Compression error:', error);
            formData.append('images', file);
          }
        }

        const uploadRes = await uploadService.uploadReviewImages(formData);
        newReviewImages =
          uploadRes.reviewImages ||
          (uploadRes.images ? uploadRes.images.map((url) => ({ secureUrl: url })) : []);
        toast.dismiss('review-upload');
      }

      const finalReviewImages = [...remoteImages, ...newReviewImages];

      if (existingReview) {
        await reviewService.update(existingReview._id, {
          rating,
          comment: comment.trim(),
          reviewImages: finalReviewImages,
          images: finalReviewImages.map((img) => img.secureUrl),
        });
        toast.success('Your review has been updated and is pending approval.');
      } else {
        await reviewService.create({
          productId,
          rating,
          comment: comment.trim(),
          reviewImages: finalReviewImages,
          images: finalReviewImages.map((img) => img.secureUrl),
        });
        toast.success('Your review has been submitted for approval!');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.dismiss('review-upload');
      const msg = err?.response?.data?.message || 'Failed to submit review.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const drawerVariants = {
    initial: isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 },
    animate: { x: 0, y: 0 },
    exit: isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 },
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex justify-center items-end sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card / Drawer */}
      <motion.div
        variants={{
          initial: { opacity: 0, y: '100%' },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: '100%' },
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-surface w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-[24px] sm:rounded-lg shadow-2xl flex flex-col z-[100000] font-body text-left border-t sm:border border-outline-variant/30"
      >
        {/* Drawer Drag Handle (Mobile Only) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 left-0 z-10">
          <div className="w-12 h-1.5 bg-outline-variant/40 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 pt-8 sm:pt-5 border-b border-outline-variant/20 shrink-0 bg-surface-bright rounded-t-[24px] sm:rounded-t-lg">
          <div>
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              {existingReview ? 'Edit Your Review' : 'Write a Review'}
            </h2>
            <p className="font-body text-[11px] text-on-surface mt-1 font-bold line-clamp-1">
              {productTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center transition-all text-secondary"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-surface">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {/* User Profile Info */}
            <div className="flex items-center gap-3 p-4 bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="font-display text-primary text-[10px] font-bold uppercase">
                  {userInitials}
                </span>
              </div>
              <div>
                <p className="font-body text-[8px] uppercase tracking-widest text-secondary font-bold">
                  Reviewing as
                </p>
                <p className="font-body text-[10px] font-bold text-on-surface uppercase tracking-wider mt-0.5">
                  {user?.name || 'Customer'}
                </p>
              </div>
            </div>

            {/* Star Picker */}
            <div className="flex flex-col items-center gap-2 py-5 bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs">
              <p className="font-label text-[9px] uppercase tracking-widest text-secondary font-bold">
                Your Rating
              </p>
              <StarRating value={rating} interactive size={28} onChange={setRating} />
              {rating > 0 && (
                <motion.p
                  key={rating}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-body text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-1"
                >
                  {ratingLabels[rating]}
                </motion.p>
              )}
            </div>

            {/* Comment */}
            <div className="bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs p-5 space-y-3">
              <label className="text-[9px] uppercase tracking-widest text-secondary font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">comment</span>
                Your Experience
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Tell others about the quality, craftsmanship, and delivery experience..."
                className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary outline-none py-2 text-[11px] text-on-surface placeholder:text-secondary/50 resize-none transition-colors"
              />
              <p className="text-[9px] text-secondary/70 font-mono text-right">
                {comment.length} chars
              </p>
            </div>

            {/* Photo Uploader */}
            <div className="bg-surface-bright rounded-lg border border-outline-variant/40 shadow-xs p-5 space-y-3">
              <label className="text-[9px] uppercase tracking-widest text-secondary font-bold flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                Add Photos (Max 5)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {combinedPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative w-14 h-14 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container shadow-sm group flex-shrink-0"
                  >
                    <OptimizedImage
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      width={80}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (idx < remoteImages.length) {
                          setRemoteImages((prev) => prev.filter((_, i) => i !== idx));
                        } else {
                          const localIdx = idx - remoteImages.length;
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== localIdx));
                          setLocalPreviews((prev) => prev.filter((_, i) => i !== localIdx));
                        }
                      }}
                      className="absolute top-1 right-1 w-4 h-4 rounded bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[10px]">close</span>
                    </button>
                  </div>
                ))}
                {selectedFiles.length < 5 && (
                  <label className="w-14 h-14 rounded-lg border border-dashed border-outline-variant/50 hover:border-primary bg-surface-container-lowest hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all gap-0.5 text-secondary hover:text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span className="text-[7px] font-bold uppercase tracking-wider">Add</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const currentTotal = remoteImages.length + selectedFiles.length;
                        const allowedRemaining = 5 - currentTotal;
                        const filesToAdd = files.slice(0, Math.max(0, allowedRemaining));

                        const newFiles = [...selectedFiles, ...filesToAdd];
                        setSelectedFiles(newFiles);

                        const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
                        setLocalPreviews((prev) => [...prev, ...newPreviews]);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="pt-2">
              <LoadingButton
                type="submit"
                loading={submitting}
                disabled={rating === 0}
                fullWidth
                icon="send"
              >
                {existingReview ? 'Update Review' : 'Submit Review'}
              </LoadingButton>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// ─── Main ProductReviews Section ─────────────────────────────────────────────
export function ProductReviews({ productId, productTitle }) {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null); // { canReview, alreadyReviewed, reason }
  const [myReview, setMyReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [_page, setPage] = useState(1);
  const [_totalPages, setTotalPages] = useState(1);

  const scrollContainerRef = useRef(null);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const fetchReviews = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await reviewService.getProductReviews(productId, { page: p, limit: 10 });
        if (res.success) {
          const data = res.data;
          const list = data.items || data.data || data || [];
          setReviews(p === 1 ? list : (prev) => [...prev, ...list]);
          setTotalPages(data.totalPages || 1);
          setPage(p);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  // ── Fetch eligibility (only when logged in) ────────────────────────────────
  const fetchEligibility = useCallback(async () => {
    if (!isAuthenticated || !productId) return;
    try {
      const res = await reviewService.canReview(productId);
      if (res.success) {
        setEligibility(res.data);
        if (res.data.alreadyReviewed) {
          const myRes = await reviewService.getMyReview(productId);
          if (myRes.success && myRes.data) setMyReview(myRes.data);
        }
      }
    } catch {
      // ignore auth errors silently
    }
  }, [isAuthenticated, productId]);

  useEffect(() => {
    if (productId) {
      fetchReviews(1);
      fetchEligibility();
    }
  }, [productId, fetchReviews, fetchEligibility]);

  // ── Average rating ────────────────────────────────────────────────────────
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const allImages = useMemo(() => {
    return reviews.reduce((acc, r) => {
      if (r.images && r.images.length > 0) {
        acc.push(...r.images);
      }
      return acc;
    }, []);
  }, [reviews]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // ── CTA button logic ──────────────────────────────────────────────────────
  const renderCTA = () => {
    const buttonClass =
      'w-10 h-10 rounded-full flex items-center justify-center bg-[#8a7337]/10 text-[#8a7337] hover:bg-[#8a7337] hover:text-white transition-all cursor-pointer shrink-0';
    const disabledClass =
      'w-10 h-10 flex items-center justify-center bg-neutral-100 text-black/40 rounded-full border border-black/5 shrink-0';

    if (!isAuthenticated) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAuthModal}
          title="Write a Review"
          className={buttonClass}
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </motion.button>
      );
    }

    if (!eligibility) {
      return (
        <div className={disabledClass + ' opacity-75'}>
          <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
        </div>
      );
    }

    if (eligibility.alreadyReviewed) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          title="Edit Your Review"
          className={buttonClass}
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </motion.button>
      );
    }

    if (eligibility.canReview) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          title="Write a Review"
          className={buttonClass}
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </motion.button>
      );
    }

    return (
      <div title="Purchase to review" className={disabledClass}>
        <span className="material-symbols-outlined text-[18px]">lock</span>
      </div>
    );
  };

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section
      id="reviews-section"
      className="relative z-10 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8 lg:py-12 overflow-hidden"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 lg:mb-6">
        <h2 className="font-display text-xl lg:text-2xl text-black text-left">What Buyers Say</h2>

        <div className="flex flex-wrap items-center gap-4">
          {reviews.length > 0 && (
            <div className="flex items-center gap-3 sm:border-r border-black/10 sm:pr-4">
              <Link
                to={`/product/${productId}/reviews`}
                title={`View all ${reviews.length} reviews`}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 border border-black/5 text-[#8a7337] transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              {reviews.length > 1 && (
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => handleScroll('left')}
                    className="w-8 h-8 rounded-full border border-black/15 flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition-all text-black/60 cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => handleScroll('right')}
                    className="w-8 h-8 rounded-full border border-black/15 flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition-all text-black/60 cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {renderCTA()}
        </div>
      </div>

      {/* Stats Row */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 mb-6 py-6 border-y border-black/5">
          {/* Big Average */}
          <div className="flex flex-col items-center justify-center sm:border-r border-black/5 sm:pr-10 w-[140px] shrink-0 gap-3">
            <div className="flex flex-col items-center gap-2">
              <span className="font-display text-5xl sm:text-6xl font-normal text-black leading-none tracking-tighter">
                {avgRating.toFixed(1)}
              </span>
              <div className="w-12 h-[1px] bg-primary"></div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <StarRating value={avgRating} size={15} />
              <span className="font-label text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Bar Breakdown */}
          <div className="flex-1 space-y-2 w-full max-w-md">
            {ratingCounts.map(({ star, count }) => {
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2.5">
                  <span className="font-label text-[11px] font-bold text-black/70 w-3 shrink-0">
                    {star}
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="#D4A853"
                    stroke="#D4A853"
                    strokeWidth="1.5"
                    className="shrink-0"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-[#D4A853] rounded-full"
                    />
                  </div>
                  <span className="font-label text-[11px] text-black/40 w-8 text-right font-semibold">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews Horizontal scroll */}
      {loading && reviews.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-box bg-white rounded-[24px] border border-black/5 p-5 space-y-3 shrink-0 w-[240px] xs:w-[280px] sm:w-[300px] lg:w-[320px] h-[160px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100/50 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 bg-neutral-100/50 rounded animate-pulse" />
                  <div className="h-2 w-16 bg-neutral-100/50 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-2.5 w-20 bg-neutral-100/50 rounded animate-pulse" />
              <div className="h-3 w-full bg-neutral-100/50 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-neutral-100/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-[24px] border border-black/5">
          <span className="material-symbols-outlined text-[48px] text-primary/30 mb-4 animate-bounce">
            rate_review
          </span>
          <p className="font-display text-lg text-black/50 font-medium">No reviews yet</p>
          <p className="font-body text-sm text-black/30 mt-1">
            Be the first verified buyer to share your experience.
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4 px-1"
        >
          {reviews.map((review) => (
            <div
              key={review._id || review.id}
              className="snap-start shrink-0 w-[240px] xs:w-[280px] sm:w-[300px] lg:w-[320px] h-auto self-stretch"
            >
              <ReviewCard review={review} productId={productId} />
            </div>
          ))}
        </div>
      )}

      {/* Customer Gallery Section */}
      {reviews.length > 0 && allImages.length > 0 && (
        <div className="mt-2 pt-4 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="font-label text-[10px] uppercase tracking-widest text-black/40 font-bold">
              Customer Gallery ({allImages.length} photo{allImages.length !== 1 ? 's' : ''})
            </span>
            <div className="flex -space-x-2">
              {allImages.slice(0, 5).map((img, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-neutral-100 flex-shrink-0 shadow-sm"
                >
                  <OptimizedImage
                    src={img}
                    alt=""
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          <Link
            to={`/product/${productId}/reviews/images`}
            className="font-label text-[10px] uppercase tracking-widest font-bold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1.5"
          >
            See All Photos
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </Link>
        </div>
      )}

      {/* Write Review Drawer */}
      <AnimatePresence>
        {showModal && (
          <WriteReviewModal
            productId={productId}
            productTitle={productTitle}
            existingReview={myReview}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              fetchReviews(1);
              fetchEligibility();
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
