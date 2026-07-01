import { m as motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { reviewService, uploadService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

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
  const rawName = review.customer?.name || review.customerName || 'Customer';
  const lowerRaw = rawName.toLowerCase();

  const isTest =
    lowerRaw.includes('test') ||
    lowerRaw.includes('anonymous') ||
    lowerRaw.includes('customer') ||
    lowerRaw.includes('dhanush1376') ||
    lowerRaw.includes('sakhisoaps') ||
    lowerRaw.includes('praneethperumalla') ||
    /^\d+$/.test(rawName) ||
    !rawName.includes(' ') ||
    rawName.includes('.');

  if (!isTest) {
    return rawName;
  }

  const seedString = review._id || review.id || String(rawName);
  const premiumNames = [
    'Aditi Rao',
    'Vikram Malhotra',
    'Meera Singhania',
    'Radha Krishnan',
    'Ananya Varma',
    'Arjun Mehta',
    'Priya Sen',
    'Rohan Joshi',
    'Kavya Iyer',
    'Devraj Singhania',
    'Siddharth Roy',
    'Aarti Patel',
    'Rajesh Kumar',
    'Sunita Reddy',
  ];

  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % premiumNames.length;
  return premiumNames[index];
}

// ─── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ review, showcaseId }) {
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[24px] border border-black/5 p-5 lg:p-6 shadow-sm hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full min-h-[220px]"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="font-display text-primary text-sm font-bold">{initials}</span>
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-black leading-tight">
                {customerName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {review.verified && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-100">
                    <span className="material-symbols-outlined text-[10px]">verified</span>
                    Verified Purchase
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="font-label text-[10px] text-black/30 font-medium shrink-0">{date}</span>
        </div>

        <StarRating value={review.rating} size={14} />

        {review.comment && (
          <p className="font-body text-[13px] text-black/70 leading-relaxed mt-3 line-clamp-3">
            {review.comment}
          </p>
        )}
      </div>

      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-black/5">
          {review.images.slice(0, 3).map((imgUrl, idx) => (
            <Link
              key={idx}
              to={`/events/#reviews/images`}
              className="w-12 h-12 rounded-xl overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group flex-shrink-0"
            >
              <OptimizedImage
                src={imgUrl}
                alt={`Review photo ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                width={64}
              />
            </Link>
          ))}
          {review.images.length > 3 && (
            <Link
              to={`/events/#reviews/images`}
              className="w-12 h-12 rounded-xl overflow-hidden border border-black/5 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-[10px] font-bold tracking-widest flex-shrink-0 transition-colors cursor-pointer"
            >
              +{review.images.length - 3}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Write Review Drawer ───────────────────────────────────────────────────────
export function WriteReviewModal({ showcaseId, showcaseTitle, onClose, onSuccess }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
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
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        toast.loading('Uploading review images...', { id: 'review-upload' });
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('images', file);
        });
        const uploadRes = await uploadService.uploadImages(formData);
        imageUrls = uploadRes.images || [];
        toast.dismiss('review-upload');
      }

      await reviewService.create({
        showcaseId,
        rating,
        comment: comment.trim(),
        images: imageUrls,
        category: 'showcase',
      });
      toast.success('Your review has been submitted for approval!');
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
              Write a Review
            </h2>
            <p className="font-body text-[11px] text-on-surface mt-1 font-bold line-clamp-1">
              {showcaseTitle}
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
                {previews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative w-14 h-14 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container shadow-sm group flex-shrink-0"
                  >
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                        setPreviews((prev) => prev.filter((_, i) => i !== idx));
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
                        const newFiles = [...selectedFiles, ...files].slice(0, 5);
                        setSelectedFiles(newFiles);

                        const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
                        setPreviews(newPreviews);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full px-6 py-3 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-0"
              >
                {submitting ? (
                  <div className="w-16 h-16 border-[1px] border-white/30 border-t-white rounded-full animate-spin duration-1000 ease-linear" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">send</span>
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// ─── Main ShowcaseReviews Section ─────────────────────────────────────────────
export function ShowcaseReviews({ showcaseId, showcaseTitle }) {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null); // { canReviewShowcase, alreadyReviewed, reason }
  const [showModal, setShowModal] = useState(false);
  const [_page, setPage] = useState(1);
  const [_totalPages, setTotalPages] = useState(1);

  const scrollContainerRef = useRef(null);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const fetchReviews = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await reviewService.getShowcaseReviews(showcaseId, { page: p, limit: 10 });
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
    [showcaseId],
  );

  // ── Fetch eligibility (only when logged in) ────────────────────────────────
  const fetchEligibility = useCallback(async () => {
    if (!isAuthenticated || !showcaseId) return;
    try {
      const res = await reviewService.canReviewShowcase(showcaseId);
      if (res.success) setEligibility(res.data);
    } catch {
      // ignore auth errors silently
    }
  }, [isAuthenticated, showcaseId]);

  useEffect(() => {
    if (showcaseId) {
      fetchReviews(1);
      fetchEligibility();
    }
  }, [showcaseId, fetchReviews, fetchEligibility]);

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
    if (!isAuthenticated) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAuthModal}
          title="Write a Review"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer animate-fade-in shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </motion.button>
      );
    }

    if (!eligibility) {
      return (
        <div className="w-10 h-10 flex items-center justify-center bg-stone-100 rounded-full border border-black/5 opacity-75 animate-fade-in shrink-0">
          <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
        </div>
      );
    }

    if (eligibility.alreadyReviewed) {
      return (
        <div
          title="You've reviewed this product"
          className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-700 rounded-full border border-green-100 animate-fade-in shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">check</span>
        </div>
      );
    }

    if (eligibility.canReviewShowcase) {
      return (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          title="Write a Review"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer animate-fade-in shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </motion.button>
      );
    }

    return (
      <div
        title="Purchase to review"
        className="w-10 h-10 flex items-center justify-center bg-neutral-100 text-black/40 rounded-full border border-black/5 animate-fade-in shrink-0"
      >
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
      className="relative z-10 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-12 lg:py-16 overflow-hidden"
    >
      {/* Section Header */}
      <div className="flex flex-row items-center justify-between gap-4 mb-8 lg:mb-10">
        <div>
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-primary font-bold block mb-1">
            Customer Reviews
          </span>
          <h2 className="font-display text-2xl lg:text-3xl text-black font-bold tracking-tight">
            What Buyers Say
          </h2>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {renderCTA()}
          {reviews.length > 0 && (
            <div className="flex items-center gap-3">
              <Link
                to={`/events/#reviews`}
                className="font-label text-[11px] uppercase tracking-widest font-bold text-primary hover:text-primary-dark mr-2 transition-colors inline-flex items-center gap-1.5"
              >
                View All ({reviews.length})
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
              {reviews.length > 1 && (
                <div className="flex items-center gap-1.5">
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
        </div>
      </div>

      {/* Stats Row */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 p-6 bg-white rounded-[24px] border border-black/5 shadow-sm">
          {/* Big Average */}
          <div className="flex flex-col items-center justify-center sm:border-r border-black/5 sm:pr-8 sm:mr-2 gap-1 shrink-0">
            <span className="font-display text-5xl font-bold text-black leading-none">
              {avgRating.toFixed(1)}
            </span>
            <StarRating value={avgRating} size={16} />
            <span className="font-label text-[10px] uppercase tracking-wider text-black/40 font-bold">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Bar Breakdown */}
          <div className="flex-1 space-y-2">
            {ratingCounts.map(({ star, count }) => {
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="font-label text-[11px] font-bold text-black/50 w-4 shrink-0">
                    {star}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="#D4A853"
                    stroke="#D4A853"
                    strokeWidth="1.5"
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
                  <span className="font-label text-[10px] text-black/30 w-8 text-right">
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
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 px-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-box bg-white rounded-[24px] border border-black/5 p-5 space-y-3 shrink-0 w-[290px] xs:w-[320px] sm:w-[360px] lg:w-[400px] h-[220px]"
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
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-6 px-1"
        >
          {reviews.map((review) => (
            <div
              key={review._id || review.id}
              className="snap-start shrink-0 w-[290px] xs:w-[320px] sm:w-[360px] lg:w-[400px] h-auto self-stretch"
            >
              <ReviewCard review={review} showcaseId={showcaseId} />
            </div>
          ))}
        </div>
      )}

      {/* Customer Gallery Section */}
      {reviews.length > 0 && allImages.length > 0 && (
        <div className="mt-8 pt-6 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    width={64}
                  />
                </div>
              ))}
            </div>
          </div>
          <Link
            to={`/events/#reviews/images`}
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
            showcaseId={showcaseId}
            showcaseTitle={showcaseTitle}
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
