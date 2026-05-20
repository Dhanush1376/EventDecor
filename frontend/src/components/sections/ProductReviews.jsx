import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reviewService } from "../../services/domainServices";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

// ─── Star Component ─────────────────────────────────────────────────────────
function StarRating({ value = 0, max = 5, interactive = false, size = 20, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || value) : value;

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
            className={`transition-transform ${interactive ? "cursor-pointer hover:scale-125" : "cursor-default"}`}
            aria-label={`${i + 1} star${i !== 0 ? "s" : ""}`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? "#D4A853" : "none"}
              stroke={filled ? "#D4A853" : "#d1c4a8"}
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

// ─── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const initials = (review.customerName || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] border border-black/5 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="font-display text-primary text-sm font-bold">{initials}</span>
          </div>
          <div>
            <p className="font-body text-sm font-semibold text-black leading-tight">{review.customerName || "Customer"}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {review.verified && (
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-100">
                  <span className="material-symbols-outlined text-[11px]">verified</span>
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
        <p className="font-body text-[13px] text-black/70 leading-relaxed mt-3">{review.comment}</p>
      )}
    </motion.div>
  );
}

// ─── Write Review Modal ───────────────────────────────────────────────────────
export function WriteReviewModal({ productId, productTitle, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error("Please select a star rating.");
    if (comment.trim().length < 10) return toast.error("Please write at least 10 characters.");

    setSubmitting(true);
    try {
      await reviewService.create({ productId, rating, comment: comment.trim() });
      toast.success("Your review has been submitted for approval!");
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to submit review.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="bg-white w-full md:max-w-lg rounded-t-[32px] md:rounded-[28px] p-6 md:p-8 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-xl font-bold text-black">Write a Review</h3>
            <p className="font-body text-[12px] text-black/40 mt-0.5 line-clamp-1">{productTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-black">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Picker */}
          <div className="flex flex-col items-center gap-2 py-4 bg-amber-50/50 rounded-2xl border border-amber-100">
            <p className="font-label text-[10px] uppercase tracking-widest text-black/40 font-bold">Your Rating</p>
            <StarRating value={rating} interactive size={36} onChange={setRating} />
            {rating > 0 && (
              <motion.p
                key={rating}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-body text-sm font-semibold text-amber-700"
              >
                {ratingLabels[rating]}
              </motion.p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-widest text-black/40 font-bold block mb-2">
              Your Experience
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Tell others about the quality, craftsmanship, and delivery experience..."
              className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-neutral-50 text-sm font-body text-black placeholder:text-black/30 outline-none focus:border-primary focus:bg-white transition-all resize-none"
            />
            <p className="text-[10px] text-black/30 mt-1 text-right">{comment.length} chars</p>
          </div>

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full h-12 bg-primary text-white rounded-full font-label text-[11px] uppercase tracking-widest font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">rate_review</span>
                Submit Review
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ProductReviews Section ─────────────────────────────────────────────
export function ProductReviews({ productId, productTitle }) {
  const { isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null); // { canReview, alreadyReviewed, reason }
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await reviewService.getProductReviews(productId, { page: p, limit: 5 });
      if (res.success) {
        const data = res.data;
        const list = data.items || data.data || data || [];
        setReviews(p === 1 ? list : (prev) => [...prev, ...list]);
        setTotalPages(data.totalPages || 1);
        setPage(p);
      }
    } catch {
      // silently fail — reviews are non-critical
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // ── Fetch eligibility (only when logged in) ────────────────────────────────
  const fetchEligibility = useCallback(async () => {
    if (!isAuthenticated || !productId) return;
    try {
      const res = await reviewService.canReview(productId);
      if (res.success) setEligibility(res.data);
    } catch {
      // ignore auth errors silently
    }
  }, [isAuthenticated, productId]);

  useEffect(() => {
    if (productId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReviews(1);
      fetchEligibility();
    }
  }, [productId, fetchReviews, fetchEligibility]);

  // ── Average rating ────────────────────────────────────────────────────────
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  // ── CTA button logic ──────────────────────────────────────────────────────
  const renderCTA = () => {
    if (!isAuthenticated) return null;
    if (!eligibility) return null;

    if (eligibility.alreadyReviewed) {
      return (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-full border border-green-100 text-[11px] font-bold font-label uppercase tracking-wider">
          <span className="material-symbols-outlined text-[15px]">check_circle</span>
          You've reviewed this product
        </div>
      );
    }

    if (eligibility.canReview) {
      return (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-label text-[11px] uppercase tracking-wider font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">rate_review</span>
          Write a Review
        </motion.button>
      );
    }

    // reason === 'not_purchased'
    return (
      <div className="flex items-center gap-2 bg-neutral-100 text-black/40 px-4 py-2.5 rounded-full text-[11px] font-label font-bold uppercase tracking-wider border border-black/5">
        <span className="material-symbols-outlined text-[15px]">lock</span>
        Purchase to review
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return null;
  }

  if (reviews.length === 0 && !eligibility?.canReview) {
    return null;
  }

  return (
    <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10">
        <div>
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-primary font-bold block mb-1">
            Customer Reviews
          </span>
          <h2 className="font-display text-2xl md:text-3xl text-black font-bold tracking-tight">
            What Buyers Say
          </h2>
        </div>
        {renderCTA()}
      </div>

      {/* Stats Row */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 p-6 bg-white rounded-[24px] border border-black/5 shadow-sm">
          {/* Big Average */}
          <div className="flex flex-col items-center justify-center sm:border-r border-black/5 sm:pr-8 sm:mr-2 gap-1">
            <span className="font-display text-5xl font-bold text-black leading-none">
              {avgRating.toFixed(1)}
            </span>
            <StarRating value={avgRating} size={16} />
            <span className="font-label text-[10px] uppercase tracking-wider text-black/40 font-bold">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Bar Breakdown */}
          <div className="flex-1 space-y-2">
            {ratingCounts.map(({ star, count }) => {
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="font-label text-[11px] font-bold text-black/50 w-4 shrink-0">{star}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#D4A853" stroke="#D4A853" strokeWidth="1.5">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-amber-400 rounded-full"
                    />
                  </div>
                  <span className="font-label text-[10px] text-black/30 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[20px] border border-black/5 p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 bg-neutral-100 rounded" />
                  <div className="h-2 w-16 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="h-2.5 w-20 bg-neutral-100 rounded" />
              <div className="h-3 w-full bg-neutral-100 rounded" />
              <div className="h-3 w-4/5 bg-neutral-100 rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-[24px] border border-black/5">
          <span className="material-symbols-outlined text-[48px] text-primary/30 mb-4">rate_review</span>
          <p className="font-display text-lg text-black/50 font-medium">No reviews yet</p>
          <p className="font-body text-sm text-black/30 mt-1">Be the first verified buyer to share your experience.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <ReviewCard key={review._id || review.id} review={review} />
            ))}
          </div>

          {/* Load More */}
          {page < totalPages && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchReviews(page + 1)}
                disabled={loading}
                className="px-8 py-3 rounded-full border border-black/10 font-label text-[11px] uppercase tracking-widest font-bold text-black/60 hover:border-primary hover:text-primary transition-all"
              >
                {loading ? "Loading..." : "Load More Reviews"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showModal && (
          <WriteReviewModal
            productId={productId}
            productTitle={productTitle}
            onClose={() => setShowModal(false)}
            onSuccess={() => { fetchReviews(1); fetchEligibility(); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
