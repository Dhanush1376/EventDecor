import { m as motion, AnimatePresence } from 'framer-motion';
import { PageHeader, SkeletonCard, FilterBar } from '../components/AdminUIKit';
import { useState, useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmProvider';
import { loyaltyService, reviewService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';

import logger from '../../utils/core/logger';
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rewardModal, setRewardModal] = useState({ isOpen: false, review: null, amount: 20 });
  const confirm = useConfirm();

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await loyaltyService.adminGetReviews();
      if (res.success) {
        const payload = res.data;
        setReviews(Array.isArray(payload) ? payload : payload?.data || []);
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

  const handleModerate = async (reviewId, action, customRewardAmount = 0) => {
    const toastId = toast.loading(
      action === 'approve' ? 'Disbursing review rewards...' : 'Rejecting review...',
    );
    try {
      const res = await loyaltyService.adminModerateReview(reviewId, action, customRewardAmount);
      if (res.success) {
        toast.success(res.message || `Review ${action}d! `, { id: toastId, duration: 4000 });
        fetchReviews(); // Refresh feed
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

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6"
    >
      {/* Title block */}
      <PageHeader
        title="Reviews & Testimonials"
        subtitle={`${reviews.length} total reviews · ${reviews.filter((r) => r.status === 'pending').length} pending approval payout`}
        headerAction={
          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] flex items-center px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
              />
            </div>
            <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-hidden">
              <FilterBar
                filters={['all', 'pending', 'approved', 'rejected']}
                value={filter}
                onChange={setFilter}
                className="flex-1 min-w-0 pb-0"
              />
            </div>
          </div>
        }
      />

      {/* Reviews feed */}
      <motion.div variants={fadeUp} className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center admin-card flex flex-col items-center justify-center p-6 shadow-sm">
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
          filtered.map((r) => {
            const customer = r.customerName || r.customer?.name || 'Bespoke Customer';
            const product = r.product?.title || 'Handcrafted Product';
            const comment = r.comment || '';
            const rating = r.rating || 5;
            const date = new Date(r.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <motion.div
                key={r._id}
                whileHover={{ y: -2 }}
                className="admin-card p-5 border border-[var(--admin-border)] transition-shadow shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container/20 to-primary/10 flex items-center justify-center">
                      <span className="text-[14px] font-bold text-black">
                        {customer.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
                          {customer}
                        </p>
                        <span className="text-[11px] sm:text-[11px] sm:text-[11px] text-secondary font-mono">
                          ({r.customer?.email || 'N/A'})
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-tertiary)]">
                        {product} · {date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-[16px]"
                          style={{
                            color:
                              i < rating
                                ? 'var(--color-primary)'
                                : 'var(--color-surface-container-highest)',
                            fontVariationSettings: "'FILL' 1",
                          }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] sm:text-[11px] sm:text-[11px] uppercase tracking-wider font-bold ${
                        r.status === 'approved'
                          ? 'text-[var(--admin-success)] bg-[var(--admin-success-light)] border border-[var(--admin-success-border)]/50'
                          : r.status === 'rejected'
                            ? 'text-[var(--admin-error)] bg-[var(--admin-error-light)] border border-[var(--admin-error-border)]/50'
                            : 'text-amber-700 bg-amber-50 border border-amber-200/50'
                      }`}
                    >
                      {r.status || 'pending'}
                    </span>
                  </div>
                </div>

                <p className="text-[13px] text-[var(--admin-text-secondary)] leading-relaxed mb-4 italic">
                  "{comment}"
                </p>

                <div className="flex items-center gap-3 border-t border-[var(--admin-border-subtle)] pt-3">
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setRewardModal({ isOpen: true, review: r, amount: 20 })}
                        className="admin-btn admin-btn-ghost admin-btn-sm group !bg-emerald-600 !text-white !border-emerald-600 !py-1.5 !px-3 !text-[11px] sm:text-[11px] flex items-center gap-1.5 cursor-pointer rounded-lg hover:brightness-110 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        Approve Review
                      </button>

                      <button
                        onClick={() => handleModerate(r._id, 'reject')}
                        className="admin-btn admin-btn-ghost admin-btn-sm group !text-[var(--admin-error)] !border-red-100 hover:!bg-[var(--admin-error-light)] !py-1.5 !px-3 !text-[11px] sm:text-[11px] flex items-center gap-1.5 cursor-pointer rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        Reject
                      </button>
                    </>
                  )}

                  {r.status === 'approved' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] text-[var(--admin-success)] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">verified</span>
                        Approved and cash disbursed
                      </span>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="admin-btn admin-btn-ghost admin-btn-sm !text-[var(--admin-text-tertiary)] hover:!text-[var(--admin-error)] !py-1 !px-2 flex items-center gap-1"
                        title="Delete Review"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  )}

                  {r.status === 'rejected' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] text-[var(--admin-error)] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">block</span>
                        Review rejected from listing feed
                      </span>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="admin-btn admin-btn-ghost admin-btn-sm !text-[var(--admin-text-tertiary)] hover:!text-[var(--admin-error)] !py-1 !px-2 flex items-center gap-1"
                        title="Delete Review"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
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
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col z-10"
            >
              <div className="p-5 border-b border-[var(--admin-border)] flex items-center justify-between bg-stone-50/50">
                <h3 className="font-bold text-[16px] text-stone-800">Reward Customer</h3>
                <button
                  onClick={() => setRewardModal({ ...rewardModal, isOpen: false })}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-emerald-600">
                      wallet
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">
                      {rewardModal.review?.customer?.name || 'Customer'}
                    </p>
                    <p className="text-[13px] text-stone-500 mt-1">
                      Total previously spent:{' '}
                      <span className="font-bold text-stone-700">
                        ₹{rewardModal.review?.customer?.totalSpent || 0}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-stone-600 uppercase tracking-wider">
                    Reward Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rewardModal.amount}
                    onChange={(e) =>
                      setRewardModal({ ...rewardModal, amount: Number(e.target.value) })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-[14px] font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[11px] text-stone-500 leading-relaxed mt-2">
                    Enter the amount to credit to their wallet. Leave as 0 to just approve without a
                    custom reward.
                  </p>
                </div>
              </div>
              <div className="p-5 border-t border-[var(--admin-border)] flex items-center justify-end gap-3 bg-stone-50/50">
                <button
                  onClick={() => setRewardModal({ ...rewardModal, isOpen: false })}
                  className="px-4 py-2 text-[13px] font-bold text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleModerate(rewardModal.review._id, 'approve', rewardModal.amount);
                    setRewardModal({ ...rewardModal, isOpen: false });
                  }}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Approve & Pay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
