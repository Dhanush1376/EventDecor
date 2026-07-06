import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProductQueries';
import { reviewService } from '../services/domainServices';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/seo/SEO';
import { WriteReviewModal, getPremiumReviewerName } from '../components/sections/ProductReviews';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

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
      className="bg-white rounded-[24px] border border-[#EBE6DD] p-6 shadow-sm hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Reviewer Info */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Initials Circle */}
            <div className="w-11 h-11 rounded-full bg-[#FAF9F6] border border-[#E2DACB] flex items-center justify-center shrink-0 shadow-2xs">
              <span className="font-serif text-[#8C7000] text-sm font-bold">{initials}</span>
            </div>
            <div>
              <p className="font-display font-semibold uppercase tracking-[0.1em] text-[#2d2b29] text-[11px] leading-tight">
                {customerName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                    <span className="material-symbols-outlined text-[10px] font-bold">
                      verified
                    </span>
                    Verified Purchase
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="font-label text-[9px] text-[#685c57]/50 font-bold uppercase tracking-wider shrink-0 mt-0.5">
            {date}
          </span>
        </div>

        {/* Stars */}
        <div className="mb-3">
          <StarRating value={review.rating} size={13} />
        </div>

        {/* Text */}
        {review.comment && (
          <p className="font-body text-[13px] text-[#4A453F] leading-relaxed whitespace-pre-line font-light">
            "{review.comment}"
          </p>
        )}
      </div>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[#F3EFE7]">
          {review.images.map((imgUrl, idx) => (
            <Link
              key={idx}
              to={`/product/${productId}/reviews/images`}
              className="w-14 h-14 rounded-xl overflow-hidden border border-[#E2DACB] bg-[#FAF9F6] shadow-3xs cursor-pointer relative group flex-shrink-0"
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
    if (!isAuthenticated) {
      return (
        <button
          onClick={openAuthModal}
          className="w-full sm:w-auto px-8 py-3.5 bg-black text-white rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-[#1C1A17] active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">rate_review</span>
          Write a Review
        </button>
      );
    }

    if (eligibility?.canReview) {
      return (
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-8 py-3.5 bg-black text-white rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-[#1C1A17] active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">rate_review</span>
          Write a Review
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
    <div className="bg-[#FAF9F6] min-h-screen pt-24 lg:pt-28 pb-20 relative overflow-hidden">
      <SEO
        title={`Reviews - ${product?.title || 'Artisanal Masterpiece'}`}
        description={`Read verified customer feedback and ratings for ${product?.title}`}
      />

      {/* Background aesthetics */}
      <MandalaArtDecor
        variant={1}
        size={400}
        opacity={0.03}
        className="-top-32 -left-32 pointer-events-none"
      />
      <MandalaArtDecor
        variant={2}
        size={500}
        opacity={0.03}
        className="bottom-20 -right-20 pointer-events-none"
      />

      <div className="max-w-[1280px] mx-auto px-margin-mobile lg:px-margin-desktop space-y-10 relative z-10">
        {/* Navigation Breadcrumb Header */}
        <div className="flex flex-col gap-3">
          <Link
            to={`/product/${id}`}
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#685c57] hover:text-[#8C7000] transition-colors self-start group"
          >
            <span className="material-symbols-outlined text-[14px] group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back to Masterpiece
          </Link>
          <h1 className="font-display text-3xl lg:text-4xl text-[#2D2B29] font-light tracking-tight mt-1">
            Customer Testimonials
          </h1>
          <div className="w-12 h-[1px] bg-[#D4AF37]/40" />
        </div>

        {/* Unified Top Dashboard */}
        <div className="bg-white rounded-[32px] border border-[#EBE6DD] p-6 lg:p-10 shadow-sm flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
          {/* Column 1: Masterpiece Reference */}
          {product && (
            <div className="flex-1 flex flex-row gap-5 items-start border-b lg:border-b-0 lg:border-r border-[#F3EFE7] pb-8 lg:pb-0 lg:pr-10 shrink-0 lg:max-w-[360px] w-full">
              <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-neutral-50 shadow-2xs border border-[#E2DACB]">
                <OptimizedImage
                  src={product.imageSrc}
                  alt={product.title}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-left min-w-0 space-y-2">
                <span className="font-label text-[9px] uppercase tracking-widest text-[#8C7000] font-bold block">
                  {product.category || 'Heritage Piece'}
                </span>
                <h2 className="font-display text-base lg:text-lg text-[#2D2B29] font-medium leading-tight line-clamp-2">
                  {product.title}
                </h2>
                <div className="flex items-center gap-2 pt-0.5">
                  <StarRating value={avgRating} size={13} />
                  <span className="font-label text-[10px] font-bold text-[#685c57]/60 uppercase tracking-wider">
                    {reviews.length} Stories
                  </span>
                </div>
                <div className="pt-2">{renderCTA()}</div>
              </div>
            </div>
          )}

          {/* Column 2: Score Card */}
          <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-stretch gap-6 lg:gap-8 justify-center">
            {/* Big Score */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#FAF9F6] border border-[#EBE6DD]/60 rounded-2xl text-center w-full sm:w-44 shrink-0 shadow-inner">
              <span className="font-display text-6xl font-light text-[#2D2B29] leading-none mb-2">
                {avgRating.toFixed(1)}
              </span>
              <StarRating value={avgRating} size={15} />
              <p className="font-label text-[9px] uppercase tracking-widest text-[#685c57]/50 font-bold mt-2">
                Average Rating
              </p>
            </div>

            {/* Progress Bars */}
            <div className="flex-1 w-full space-y-3 justify-center flex flex-col">
              {ratingCounts.map(({ star, count }) => {
                const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="font-label text-[11px] font-bold text-[#2D2B29]/60 w-4 shrink-0 text-center">
                      {star}
                    </span>
                    <Star className="w-3.5 h-3.5 fill-current text-[#D4AF37] shrink-0" />
                    <div className="flex-1 h-1 bg-[#F3EFE7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-label text-[10px] text-[#685c57]/50 font-bold w-8 text-right">
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
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#685c57]/50 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text in reviews..."
                className="w-full lg:w-72 pl-10 pr-4 py-3 rounded-full border border-[#E2DACB] bg-white text-xs font-body text-black placeholder:text-[#685c57]/35 outline-none focus:border-[#8C7000] transition-all shadow-3xs"
              />
            </div>
          </div>
        )}

        {/* Results Showcase Grid */}
        {filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[2.5rem] border border-[#EBE6DD] shadow-sm p-10">
            <span className="material-symbols-outlined text-5xl text-[#D4AF37]/35 mb-4 block">
              rate_review
            </span>
            <h4 className="text-lg font-display font-medium text-[#2d2b29]">No Matches Found</h4>
            <p className="text-xs text-[#685c57]/60 max-w-xs mx-auto mt-2 leading-relaxed font-body">
              There are no celebration reviews matching your star filter or search text.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
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
