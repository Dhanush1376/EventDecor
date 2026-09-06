import { BadgeCheck, PenSquare, Search } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProductQueries';
import { reviewService } from '../services/domainServices';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/seo/SEO';
import { WriteReviewModal, getPremiumReviewerName } from '../components/sections/ProductReviews';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { m as motion, AnimatePresence } from 'framer-motion';
import Star from 'lucide-react/dist/esm/icons/star';

// Premium Gold Star Rating
function StarRating({ value = 0, max = 5, size = 15 }) {
  return (
    <div className="flex items-center gap-0.5 select-none">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#D4AF37' : 'none'}
            stroke={filled ? '#D4AF37' : '#E5DFD3'}
            strokeWidth="1.5"
            className="transition-transform hover:scale-110 duration-200"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

// Elegant Detailed Review Card
function FullPageReviewCard({ review, productId }) {
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[24px] border border-black/5 p-5 shadow-sm hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Reviewer Info */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Initials Circle */}
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="font-display text-primary text-xs font-bold">{initials}</span>
            </div>
            <div>
              <p className="font-body text-xs font-semibold text-black leading-tight">
                {customerName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/50">
                    <BadgeCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" strokeWidth={2} />
                    Verified Purchase
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="font-label text-[9px] text-black/40 font-medium shrink-0 mt-0.5">
            {date}
          </span>
        </div>

        {/* Stars */}
        <div className="mb-2.5">
          <StarRating value={review.rating} size={12} />
        </div>

        {/* Text */}
        {review.comment && (
          <p className="font-body text-xs text-[#4A453F] leading-relaxed whitespace-pre-line font-light line-clamp-4">
            "{review.comment}"
          </p>
        )}
      </div>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-black/5">
          {review.images.map((imgUrl, idx) => (
            <Link
              key={idx}
              to={`/product/${productId}/reviews/images`}
              className="w-10 h-10 rounded-lg overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group flex-shrink-0"
            >
              <OptimizedImage
                src={imgUrl}
                alt={`Review photo ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function ProductAllReviews() {
  const { id } = useParams();
  const { data: product, isLoading: productLoading } = useProduct(id);
  const { isAuthenticated, openAuthModal } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [starFilter, setStarFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReviews = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await reviewService.getProductReviews(id, { page: p, limit: 15 });
        if (res.success) {
          const data = res.data;
          const list = data.items || data.data || data || [];
          setReviews(list);
          setTotalPages(data.totalPages || 1);
          setPage(p);
        }
      } catch (_err) {
        toast.error('Failed to fetch reviews.');
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  const fetchEligibility = useCallback(async () => {
    if (!isAuthenticated || !id) return;
    try {
      const res = await reviewService.canReview(id);
      if (res.success) setEligibility(res.data);
    } catch {
      // ignore
    }
  }, [isAuthenticated, id]);

  useEffect(() => {
    if (id) {
      fetchReviews(1);
      fetchEligibility();
    }
  }, [id, fetchReviews, fetchEligibility]);

  // Client-side filtering
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchStar = starFilter === 'all' || Math.round(r.rating) === parseInt(starFilter, 10);
      const matchText =
        !searchQuery ||
        (r.comment || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStar && matchText;
    });
  }, [reviews, starFilter, searchQuery]);

  const avgRating = useMemo(() => {
    return reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  }, [reviews]);

  const ratingCounts = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => Math.round(r.rating) === star).length,
    }));
  }, [reviews]);

  const renderCTA = () => {
    const buttonClass =
      'text-[#8C7000] hover:text-[#D4AF37] transition-all cursor-pointer flex items-center justify-center shrink-0 p-1 -mt-0.5';

    if (!isAuthenticated) {
      return (
        <button onClick={openAuthModal} title="Write a Review" className={buttonClass}>
          <PenSquare className="text-[14px]" strokeWidth={1.5} />
        </button>
      );
    }

    if (eligibility?.canReview) {
      return (
        <button onClick={() => setShowModal(true)} title="Write a Review" className={buttonClass}>
          <PenSquare className="text-[14px]" strokeWidth={1.5} />
        </button>
      );
    }

    return null;
  };

  if (productLoading || (loading && reviews.length === 0)) {
    return (
      <div className="min-h-screen pt-32 pb-16 bg-[#FAF9F6] flex items-center justify-center">
        <div className="w-16 h-16 border-[1px] border-primary/30 border-t-primary rounded-full animate-spin duration-1000 ease-linear" />
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-16 sm:pt-20 lg:pt-22 pb-14 relative overflow-hidden">
      <SEO
        title={`Reviews - ${product?.title || 'Artisanal Masterpiece'}`}
        description={`Read verified customer feedback and ratings for ${product?.title}`}
      />

      <div className="max-w-[1280px] mx-auto px-margin-mobile lg:px-margin-desktop space-y-4 sm:space-y-5 relative z-10">
        {/* Navigation Breadcrumb Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl text-[#2D2B29] font-light tracking-tight">
            Customer Testimonials
          </h1>
          <div className="w-10 h-[1px] bg-[#D4AF37]/40" />
        </div>

        {/* Unified Top Dashboard */}
        <div className="bg-white rounded-[24px] border border-black/5 p-4 sm:p-5 lg:p-6 shadow-sm flex flex-col lg:flex-row gap-5 lg:gap-8 items-stretch">
          {/* Column 1: Masterpiece Reference */}
          {product && (
            <div className="flex-1 flex flex-row gap-4 items-center border-b lg:border-b-0 lg:border-r border-[#F3EFE7] pb-6 lg:pb-0 lg:pr-6 shrink-0 lg:max-w-[320px] w-full">
              <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-[12px] overflow-hidden shrink-0 bg-neutral-50 shadow-2xs border border-[#E2DACB]">
                <OptimizedImage
                  src={product.imageSrc}
                  alt={product.title}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-left min-w-0 space-y-1.5 flex flex-col items-start">
                <span className="font-label text-[8px] uppercase tracking-widest text-[#8C7000] font-bold block">
                  {product.category || 'Heritage Piece'}
                </span>
                <h2 className="font-display text-sm lg:text-base text-[#2D2B29] font-medium leading-tight line-clamp-2">
                  {product.title}
                </h2>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <StarRating value={avgRating} size={11} />
                  <span className="font-label text-[9px] font-bold text-[#685c57]/60 uppercase tracking-wider flex items-center gap-1">
                    {reviews.length} Stories
                    {renderCTA()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Column 2: Score Card */}
          <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-stretch gap-5 lg:gap-6 justify-center">
            {/* Big Score */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#FAF9F6] border border-[#EBE6DD]/60 rounded-[16px] text-center w-full sm:w-32 shrink-0 shadow-inner">
              <span className="font-display text-4xl lg:text-5xl font-light text-[#2D2B29] leading-none mb-2">
                {avgRating.toFixed(1)}
              </span>
              <StarRating value={avgRating} size={13} />
              <p className="font-label text-[8px] uppercase tracking-widest text-[#685c57]/50 font-bold mt-1.5">
                Average Rating
              </p>
            </div>

            {/* Progress Bars */}
            <div className="flex-1 w-full space-y-2 justify-center flex flex-col">
              {ratingCounts.map(({ star, count }) => {
                const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="font-label text-[10px] font-bold text-[#2D2B29]/60 w-3 shrink-0 text-center">
                      {star}
                    </span>
                    <Star className="w-3 h-3 fill-current text-[#D4AF37] shrink-0" />
                    <div className="flex-1 h-1 bg-[#F3EFE7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-label text-[9px] text-[#685c57]/50 font-bold w-6 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Toolbar: Filters and Search */}
        {reviews.length > 0 && (
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 border-b border-[#EBE6DD] pb-6">
            {/* Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="font-label text-[9px] font-bold text-[#685c57] uppercase tracking-widest">
                Filter by rating
              </span>
              <div className="flex flex-wrap gap-2">
                {['all', '5', '4', '3', '2', '1'].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStarFilter(star)}
                    className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      starFilter === star
                        ? 'bg-[#8C7000] border-[#8C7000] text-white shadow-xs'
                        : 'bg-white border-[#E2DACB] text-[#685c57] hover:border-[#8C7000] hover:text-[#8C7000]'
                    }`}
                  >
                    {star === 'all' ? 'All Ratings' : `${star} Star`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Search Box */}
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-black/40 pointer-events-none"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text in reviews..."
                className="w-full lg:w-72 pl-10 pr-4 py-2.5 rounded-full border border-black/10 bg-white text-xs font-body text-black placeholder:text-black/40 outline-none focus:border-black/30 transition-all shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Results Showcase Grid */}
        {filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[24px] border border-[#EBE6DD] shadow-sm p-8">
            <span className="material-symbols-outlined text-4xl text-[#D4AF37]/35 mb-3 block">
              rate_review
            </span>
            <h4 className="text-base font-display font-medium text-[#2d2b29]">No Matches Found</h4>
            <p className="text-xs text-[#685c57]/60 max-w-xs mx-auto mt-1.5 leading-relaxed font-body">
              There are no celebration reviews matching your star filter or search text.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredReviews.map((review) => (
              <FullPageReviewCard key={review._id || review.id} review={review} productId={id} />
            ))}
          </div>
        )}

        {/* Load More Pagination */}
        {page < totalPages && (
          <div className="flex justify-center pt-10">
            <button
              onClick={() => fetchReviews(page + 1)}
              disabled={loading}
              className="px-8 py-3.5 rounded-full border border-[#E2DACB] font-label text-[10px] uppercase tracking-widest font-bold text-[#685c57] hover:border-[#8C7000] hover:text-[#8C7000] transition-all flex items-center justify-center gap-2 cursor-pointer bg-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#8C7000] border-t-transparent rounded-full animate-spin" />
              ) : (
                'Load More Testimonials'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Submission side drawer overlay */}
      <AnimatePresence>
        {showModal && (
          <WriteReviewModal
            productId={id}
            productTitle={product?.title}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              fetchReviews(1);
              fetchEligibility();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
