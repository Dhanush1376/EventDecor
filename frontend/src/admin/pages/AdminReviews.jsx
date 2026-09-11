import { m as motion, AnimatePresence } from 'framer-motion';
import {
  PageHeader,
  AdminReviewsSkeleton,
  AdminReviewCardsSkeleton,
} from '../components/AdminUIKit';
import { useState, useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmProvider';
import { loyaltyService, reviewService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import logger from '../../utils/core/logger';

const fadeUp = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
};

const getReviewStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') {
    return {
      classes:
        'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      label: 'APPROVED',
    };
  }
  if (s === 'rejected') {
    return {
      classes:
        'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400',
      dot: 'bg-rose-500',
      label: 'REJECTED',
    };
  }
  return {
    classes:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 animate-pulse',
    label: 'PENDING',
  };
};

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rewardModal, setRewardModal] = useState({ isOpen: false, review: null, amount: 20 });
  const [reviewImageSelections, setReviewImageSelections] = useState({});
  const [savingReviewImages, setSavingReviewImages] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [cardExpansionOverrides, setCardExpansionOverrides] = useState({});
  const confirm = useConfirm();

  const toggleExpandCard = (id) => {
    setCardExpansionOverrides((prev) => {
      const target = reviews.find((r) => r._id === id);
      const defaultExpanded = target ? target.status !== 'approved' : false;
      const current = prev[id] !== undefined ? prev[id] : defaultExpanded;
      return { ...prev, [id]: !current };
    });
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await loyaltyService.adminGetReviews();
      if (res.success) {
        const payload = res.data;
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        setReviews(list);

        // Initialize approved image selections for each review
        const initialMap = {};
        list.forEach((r) => {
          initialMap[r._id] = Array.isArray(r.images) ? [...r.images] : [];
        });
        setReviewImageSelections(initialMap);
      }
    } catch (err) {
      logger.error('Failed to load reviews:', err);
      toast.error(getErrorMessage(err, 'Could not fetch customer reviews feed.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleImageApproval = (reviewId, imgUrl) => {
    setReviewImageSelections((prev) => {
      const current = prev[reviewId] !== undefined ? prev[reviewId] : [];
      const updated = current.includes(imgUrl)
        ? current.filter((url) => url !== imgUrl)
        : [...current, imgUrl];
      return { ...prev, [reviewId]: updated };
    });
  };

  const selectAllImages = (reviewId, allImages) => {
    setReviewImageSelections((prev) => ({
      ...prev,
      [reviewId]: [...allImages],
    }));
  };

  const deselectAllImages = (reviewId) => {
    setReviewImageSelections((prev) => ({
      ...prev,
      [reviewId]: [],
    }));
  };

  const handleSaveImages = async (reviewId) => {
    const approvedImages = reviewImageSelections[reviewId] || [];
    setSavingReviewImages((prev) => ({ ...prev, [reviewId]: true }));
    const toastId = toast.loading('Saving approved images...');
    try {
      const res = await loyaltyService.adminUpdateReviewImages(reviewId, approvedImages);
      if (res.success) {
        toast.success(res.message || 'Review images updated!', { id: toastId });
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? { ...r, images: approvedImages } : r)),
        );
      } else {
        toast.error(res.message || 'Failed to update images', { id: toastId });
      }
    } catch (err) {
      logger.error('Error updating review images:', err);
      toast.error('Failed to update review images', { id: toastId });
    } finally {
      setSavingReviewImages((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleModerate = async (reviewId, action, customRewardAmount = 0) => {
    const approvedImages = reviewImageSelections[reviewId];
    const toastId = toast.loading(
      action === 'approve' ? 'Disbursing review rewards...' : 'Rejecting review...',
    );
    try {
      const res = await loyaltyService.adminModerateReview(
        reviewId,
        action,
        customRewardAmount,
        approvedImages,
      );
      if (res.success) {
        toast.success(res.message || `Review ${action}d! `, { id: toastId, duration: 4000 });
        if (action === 'approve') {
          setCardExpansionOverrides((prev) => ({ ...prev, [reviewId]: false }));
        }
        fetchReviews();
      } else {
        toast.error(res.message || 'Failed to update review status', { id: toastId });
      }
    } catch (err) {
      logger.error('Error moderating review:', err);
      toast.error('Review moderation action failed.', { id: toastId });
    }
  };

  const handleDelete = async (reviewId) => {
    if (
      !(await confirm({
        title: 'Delete Review',
        message: 'Are you sure you want to delete this review?',
        type: 'danger',
      }))
    )
      return;

    const toastId = toast.loading('Deleting review...');
    try {
      const res = await reviewService.delete(reviewId);
      if (res.success) {
        toast.success('Review deleted successfully', { id: toastId });
        fetchReviews();
      } else {
        toast.error('Failed to delete review', { id: toastId });
      }
    } catch (err) {
      logger.error('Error deleting review:', err);
      toast.error('Error deleting review', { id: toastId });
    }
  };

  const handleUndo = async (reviewId) => {
    if (
      !(await confirm({
        title: 'Undo Review Moderation',
        message:
          'Are you sure you want to unpublish this review and revert it back to pending status?',
        confirmText: 'Yes, Undo',
        type: 'warning',
      }))
    )
      return;

    const toastId = toast.loading('Reverting review to pending...');
    try {
      const res = await loyaltyService.adminModerateReview(reviewId, 'undo');
      if (res.success) {
        toast.success(res.message || 'Review reverted to pending', { id: toastId });
        setCardExpansionOverrides((prev) => ({ ...prev, [reviewId]: true }));
        fetchReviews();
      } else {
        toast.error(res.message || 'Failed to undo moderation', { id: toastId });
      }
    } catch (err) {
      logger.error('Error undoing review:', err);
      toast.error('Failed to undo review moderation', { id: toastId });
    }
  };

  const filtered = reviews.filter((r) => {
    const statusVal = r.status || 'pending';
    const matchesFilter = filter === 'all' || statusVal === filter;

    const customer = r.customerName || r.customer?.name || 'Bespoke Customer';
    const product = r.product?.title || 'Handcrafted Product';
    const comment = r.comment || '';

    const matchesSearch =
      !searchQuery ||
      customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const tabCounts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  if (loading && reviews.length === 0) {
    return <AdminReviewsSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      {/* Page Header */}
      <PageHeader
        title="Reviews & Testimonials"
        subtitle={
          loading ? (
            <span>Loading reviews...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {reviews.length} Total Reviews
              </span>
              {tabCounts.pending > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {tabCounts.pending} Pending Approval
                </span>
              )}
              {tabCounts.approved > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {tabCounts.approved} Approved
                </span>
              )}
              {tabCounts.rejected > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {tabCounts.rejected} Rejected
                </span>
              )}
            </div>
          )
        }
      />

      {/* Sticky 42px Search & Controls Bar */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-5">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              placeholder="Search reviews by customer, product, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Status Segmented Pill Switcher (Desktop & Tablet) */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px] min-h-[42px] max-h-[42px] box-border">
              {['all', 'pending', 'approved', 'rejected'].map((tab) => {
                const isActive = filter === tab;
                const count = tabCounts[tab] || 0;
                const label = tab.charAt(0).toUpperCase() + tab.slice(1);

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3 rounded-[3px] text-[12px] font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap capitalize box-border ${
                      isActive
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isActive
                          ? 'bg-[var(--admin-accent)] text-white'
                          : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-subtle)]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Filter Select Dropdown */}
            <div className="sm:hidden relative shrink-0">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-[42px] px-2.5 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] rounded-[4px] text-[12px] font-semibold outline-none cursor-pointer capitalize"
              >
                {['all', 'pending', 'approved', 'rejected'].map((tab) => (
                  <option key={tab} value={tab}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tabCounts[tab] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reviews Feed */}
      <motion.div variants={fadeUp} className="space-y-3">
        {loading ? (
          <AdminReviewCardsSkeleton />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center admin-card flex flex-col items-center justify-center p-6 shadow-xs">
            <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-secondary)]/40 mb-2 block">
              search_off
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)] mt-1">
              No Reviews Found
            </p>
            <p className="text-[12px] text-[var(--admin-text-secondary)] max-w-[280px]">
              No testimonials or reviews matched your active filters or search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filtered.map((r) => {
              const rId = r._id;
              const status = r.status || 'pending';
              const isExpanded =
                cardExpansionOverrides[rId] !== undefined
                  ? cardExpansionOverrides[rId]
                  : status !== 'approved';
              const customer = r.customerName || r.customer?.name || 'Bespoke Customer';
              const product = r.product?.title || 'Handcrafted Decor Product';
              const comment = r.comment || '';
              const rating = r.rating || 5;
              const dateStr = new Date(r.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              const allImages =
                r.originalImages && r.originalImages.length > 0
                  ? r.originalImages
                  : r.reviewImages && r.reviewImages.length > 0
                    ? r.reviewImages.map((img) => (typeof img === 'string' ? img : img.secureUrl))
                    : r.images || [];

              const currentApproved =
                reviewImageSelections[rId] !== undefined
                  ? reviewImageSelections[rId]
                  : r.images || [];

              const approvedCount = allImages.filter((img) => currentApproved.includes(img)).length;
              const persisted = r.images || [];
              const isDirty =
                persisted.length !== currentApproved.length ||
                currentApproved.some((img) => !persisted.includes(img));

              const productThumbnail =
                r.product?.imageSrc ||
                r.product?.images?.[0] ||
                r.product?.image ||
                r.showcase?.image ||
                r.showcase?.coverImage ||
                r.showcase?.gallery?.[0] ||
                r.productSnapshot?.imageSrc ||
                r.productSnapshot?.image ||
                null;

              return (
                <div
                  key={rId}
                  className="relative overflow-hidden rounded-[8px] p-3.5 shadow-xs border border-stone-200/90 dark:border-stone-700/80 bg-white dark:bg-stone-900 flex flex-col gap-3 transition-all hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm"
                >
                  {/* Header: ID + Customer on Left, Status Pill & Star Rating at Right End */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[13px] font-extrabold text-[var(--admin-text-primary)]">
                          #{rId.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] block mt-0.5 truncate">
                        {customer} {r.customer?.email ? `• ${r.customer.email}` : ''}
                      </span>
                    </div>

                    {/* Status & Gold Star Rating Badge at Right End */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(() => {
                        const sBadge = getReviewStatusBadge(status);
                        return (
                          <div
                            className={`h-[25px] flex items-center gap-1 px-2 rounded-[4px] border text-[11px] font-extrabold shadow-3xs tracking-wider leading-none ${sBadge.classes}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sBadge.dot}`} />
                            <span className="leading-none">{sBadge.label}</span>
                          </div>
                        );
                      })()}
                      <div className="h-[25px] flex items-center gap-1 px-2 rounded-[4px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[11px] font-extrabold shadow-3xs leading-none">
                        <span
                          className="material-symbols-outlined text-[13px] font-black leading-none"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <span className="leading-none">{Number(rating).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Verified Product Snapshot Box */}
                  <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[6px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                    {productThumbnail ? (
                      <img
                        src={productThumbnail}
                        alt={product}
                        className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 dark:border-stone-700 bg-white shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(productThumbnail);
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs text-amber-700 dark:text-amber-400">
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                          VERIFIED REVIEW
                        </span>
                        {allImages.length > 0 && (
                          <span className="text-[9px] font-bold text-stone-600 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0">
                            {allImages.length} Photo{allImages.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                        title={product}
                      >
                        {product}
                      </p>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          calendar_today
                        </span>
                        Reviewed on {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* 4. Customer Review Quote Snippet & Attachments Indicator */}
                  {(comment || allImages.length > 0) && (
                    <div className="bg-stone-50/90 dark:bg-stone-800/40 px-2.5 py-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60 flex flex-col gap-1.5">
                      {comment && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 italic line-clamp-2">
                          "{comment}"
                        </p>
                      )}

                      {allImages.length > 0 && (
                        <div
                          className={`flex items-center justify-between gap-2 ${
                            comment
                              ? 'pt-1.5 border-t border-stone-200/60 dark:border-stone-700/50'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[13px] text-amber-700 dark:text-amber-400 shrink-0">
                              attach_file
                            </span>
                            <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 truncate">
                              {allImages.length} Attachment{allImages.length > 1 ? 's' : ''}
                              {status === 'approved' && approvedCount > 0
                                ? ` • ${approvedCount} live`
                                : ''}
                            </span>
                          </div>

                          {/* Mini Photo Previews */}
                          <div className="flex items-center -space-x-1.5 shrink-0">
                            {allImages.slice(0, 3).map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt={`Attachment ${idx + 1}`}
                                className="w-5 h-5 !w-[20px] !h-[20px] !rounded-full object-cover border-2 border-white dark:border-stone-800 shadow-xs cursor-pointer hover:scale-115 hover:z-10 transition-transform aspect-square"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(imgUrl);
                                }}
                                title="Click to preview attachment"
                              />
                            ))}
                            {allImages.length > 3 && (
                              <span className="w-5 h-5 !w-[20px] !h-[20px] !rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[8px] font-bold flex items-center justify-center border-2 border-white dark:border-stone-800 aspect-square">
                                +{allImages.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Financial Reward & Payout Strip */}
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                        Reward:
                      </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-[12.5px]">
                        ₹{r.rewardPaid !== undefined ? r.rewardPaid : 20}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">
                        {status === 'approved' ? 'Disbursed' : 'Pending Approval'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {status === 'approved' && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <span className="material-symbols-outlined text-[11px]">
                            check_circle
                          </span>
                          Live
                        </span>
                      )}
                      {status === 'rejected' && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-rose-50 text-rose-700 border-rose-200">
                          <span className="material-symbols-outlined text-[11px]">block</span>
                          Rejected
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-amber-50 text-amber-800 border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5. Symmetrical Action Controls (Equal 36px Height, 6px Radius) */}
                  {status === 'pending' ? (
                    <div
                      className="flex items-center justify-between pt-2 border-t border-stone-200/70 dark:border-stone-700/60 gap-2 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {/* APPROVE Button (Emerald with 6px radius, 36px height) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRewardModal({
                              isOpen: true,
                              review: r,
                              amount: r.rewardPaid && r.rewardPaid > 0 ? 0 : 20,
                            });
                          }}
                          className="flex-1 min-w-0 h-9 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0"
                        >
                          <span className="material-symbols-outlined text-[15px] shrink-0">
                            check
                          </span>
                          <span>Approve</span>
                        </button>

                        {/* REJECT Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModerate(rId, 'reject');
                          }}
                          className="h-9 px-2.5 rounded-[6px] border border-red-200 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                          <span>Reject</span>
                        </button>
                      </div>

                      {/* DETAILS Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandCard(rId);
                        }}
                        className={`h-9 px-3 rounded-[6px] border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                          isExpanded
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                            : 'border-stone-200/90 dark:border-stone-700 bg-white dark:bg-stone-800 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                        }`}
                      >
                        <span>Details</span>
                        <span
                          className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-amber-600' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/60 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Box 1: Revert / Undo Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUndo(rId);
                        }}
                        className="w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[6px] border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:bg-amber-100"
                        title="Revert review to pending"
                      >
                        <span className="material-symbols-outlined text-[15px]">undo</span>
                        <span>Revert</span>
                      </button>

                      {/* Box 2: Details Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandCard(rId);
                        }}
                        className={`w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[6px] border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isExpanded
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Details</span>
                        <span
                          className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-amber-600' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                    </div>
                  )}

                  {/* 6. Expandable Details Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key={`review-expanded-${rId}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          className="pt-3 border-t border-stone-200/80 dark:border-stone-700/80 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Customer Contact Box (2 equal columns sideways aligned with icons) */}
                          {(r.customer?.phone || r.customerPhone) && (
                            <div className="grid grid-cols-2 gap-2">
                              <a
                                href={`tel:${r.customer?.phone || r.customerPhone}`}
                                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[6px] border border-stone-200 dark:border-stone-700 bg-[#FAF9F5] dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-semibold hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                              >
                                <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-500 shrink-0">
                                  call
                                </span>
                                <span className="truncate">
                                  {r.customer?.phone || r.customerPhone}
                                </span>
                              </a>

                              <a
                                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.customer?.phone || r.customerPhone || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[6px] border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 transition-colors"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          )}

                          {/* Customer Uploaded Photos with Approval Selectors */}
                          {allImages.length > 0 && (
                            <div className="bg-stone-50/80 dark:bg-stone-800/40 rounded-[6px] p-2.5 border border-stone-200/60 dark:border-stone-700/60 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px] text-stone-500">
                                    photo_library
                                  </span>
                                  Photos ({approvedCount}/{allImages.length} approved)
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => selectAllImages(rId, allImages)}
                                    className="text-[10.5px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                  >
                                    All
                                  </button>
                                  <span className="text-stone-300">·</span>
                                  <button
                                    type="button"
                                    onClick={() => deselectAllImages(rId)}
                                    className="text-[10.5px] font-bold text-stone-500 hover:underline cursor-pointer"
                                  >
                                    None
                                  </button>
                                  {isDirty && (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveImages(rId)}
                                      disabled={savingReviewImages[rId]}
                                      className="ml-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-[4px] transition-all cursor-pointer"
                                    >
                                      {savingReviewImages[rId] ? 'Saving...' : 'Save'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {allImages.map((imgUrl, imgIdx) => {
                                  const isApproved = currentApproved.includes(imgUrl);
                                  return (
                                    <div
                                      key={imgIdx}
                                      onClick={() => toggleImageApproval(rId, imgUrl)}
                                      className={`relative rounded-[6px] overflow-hidden border-2 transition-all cursor-pointer ${
                                        isApproved
                                          ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                                          : 'border-stone-300 opacity-60 border-dashed'
                                      }`}
                                    >
                                      <img
                                        src={imgUrl}
                                        alt={`Upload ${imgIdx + 1}`}
                                        className="w-16 h-16 object-cover"
                                      />
                                      <div className="absolute top-1 left-1 pointer-events-none">
                                        <span
                                          className={`flex items-center justify-center text-white text-[8px] font-black ${
                                            isApproved ? 'bg-emerald-600' : 'bg-stone-700'
                                          }`}
                                          style={{
                                            width: '16px',
                                            height: '16px',
                                            minWidth: '16px',
                                            minHeight: '16px',
                                            borderRadius: '50%',
                                          }}
                                        >
                                          {isApproved ? '✓' : '✕'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewImage(imgUrl);
                                        }}
                                        title="Zoom photo"
                                        className="absolute bottom-1 right-1 bg-black/75 hover:bg-black/95 text-white flex items-center justify-center shadow-sm cursor-pointer transition-all"
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          minWidth: '24px',
                                          minHeight: '24px',
                                          maxWidth: '24px',
                                          maxHeight: '24px',
                                          borderRadius: '50%',
                                          padding: 0,
                                          margin: 0,
                                          border: 'none',
                                          outline: 'none',
                                        }}
                                      >
                                        <span
                                          className="material-symbols-outlined pointer-events-none select-none"
                                          style={{
                                            fontSize: '14px',
                                            lineHeight: '1',
                                            width: '14px',
                                            height: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          zoom_in
                                        </span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Full Customer Comment */}
                          <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2.5 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60 space-y-1 text-[11px]">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-stone-500 block">
                              Full Testimonial
                            </span>
                            <p className="text-[11.5px] text-stone-700 dark:text-stone-200 leading-relaxed italic">
                              "{comment}"
                            </p>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10.5px] text-stone-400">
                              {r.customer?.totalSpent
                                ? `Total spent: ₹${r.customer.totalSpent}`
                                : `ID: ${rId.slice(-8)}`}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(rId);
                              }}
                              className="h-7 px-2.5 rounded-[5px] border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                              title="Delete review"
                            >
                              <span className="material-symbols-outlined text-[13px]">delete</span>
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Custom Reward Modal */}
      <AnimatePresence>
        {rewardModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRewardModal({ ...rewardModal, isOpen: false })}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-t-[10px] sm:rounded-[8px] shadow-xl overflow-hidden flex flex-col z-10 border border-stone-200/80 dark:border-stone-700/80"
            >
              <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-stone-50/50 dark:bg-stone-800/50">
                <h3 className="font-bold text-[16px] text-stone-800 dark:text-stone-100">
                  Reward Customer
                </h3>
                <button
                  onClick={() => setRewardModal({ ...rewardModal, isOpen: false })}
                  className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-[6px] bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px] text-emerald-600 dark:text-emerald-400">
                      wallet
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 dark:text-stone-100 truncate">
                      {rewardModal.review?.customer?.name || 'Customer'}
                    </p>
                    <p className="text-[12.5px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Total previously spent:{' '}
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        ₹{rewardModal.review?.customer?.totalSpent || 0}
                      </span>
                    </p>
                    {rewardModal.review?.rewardPaid > 0 && (
                      <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Already paid reward: ₹{rewardModal.review.rewardPaid}
                      </p>
                    )}
                  </div>
                </div>

                {rewardModal.review?.rewardPaid > 0 && (
                  <div className="p-3 rounded-[6px] bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                      info
                    </span>
                    <div className="text-[11.5px] text-amber-900 dark:text-amber-300 leading-relaxed">
                      <p className="font-bold text-amber-950 dark:text-amber-200">
                        Already paid ₹{rewardModal.review.rewardPaid} for this review.
                      </p>
                      <p className="text-amber-800 dark:text-amber-400 text-[11px] mt-0.5">
                        Amount is automatically preset to <strong>₹0</strong> so the customer is not
                        double-paid upon re-approving. Leave as 0 to approve without extra payment,
                        or enter an amount if you want to pay an additional reward.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                    Reward Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rewardModal.amount}
                    onChange={(e) =>
                      setRewardModal({ ...rewardModal, amount: Number(e.target.value) })
                    }
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-[6px] px-3.5 py-2.5 text-[14px] font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-relaxed mt-1">
                    {rewardModal.review?.rewardPaid > 0
                      ? `Already credited ₹${rewardModal.review.rewardPaid}. Leave as 0 to re-approve without paying again.`
                      : 'Enter the amount to credit to their wallet. Leave as 0 to just approve without a custom reward.'}
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-5 border-t border-[var(--admin-border)] flex items-center justify-end gap-2.5 bg-stone-50/50 dark:bg-stone-800/50">
                <button
                  type="button"
                  onClick={() => setRewardModal({ ...rewardModal, isOpen: false })}
                  className="h-9 px-4 rounded-[6px] border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-[12px] font-bold text-stone-600 hover:text-stone-900 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all cursor-pointer flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleModerate(rewardModal.review._id, 'approve', rewardModal.amount);
                    setRewardModal({ ...rewardModal, isOpen: false });
                  }}
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-[6px] text-[12px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-0"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>
                    {rewardModal.amount > 0
                      ? `Approve & Pay ₹${rewardModal.amount}`
                      : 'Approve Review (₹0)'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Zoom Preview Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-3xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="Review Photo Preview"
                className="w-full h-full object-contain max-h-[85vh]"
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
