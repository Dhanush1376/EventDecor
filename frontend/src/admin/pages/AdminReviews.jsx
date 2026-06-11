import { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { loyaltyService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelpers';

import logger from '../../utils/logger';
import { SkeletonDashboard, PageHeader, FilterBar } from '../components/AdminUIKit';
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleModerate = async (reviewId, action) => {
    const toastId = toast.loading(
      action === 'approve' ? 'Disbursing review rewards...' : 'Rejecting review...',
    );
    try {
      const res = await loyaltyService.adminModerateReview(reviewId, action);
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

  const filtered = reviews.filter((r) => {
    const statusVal = r.status || 'pending';
    const matchesFilter = filter === 'all' || statusVal === filter;

    const customer = r.user?.name || 'Bespoke Customer';
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
          <div className="w-full sm:max-w-md">
            <FilterBar
              filters={['all', 'pending', 'approved', 'rejected']}
              value={filter}
              onChange={setFilter}
              className="pb-0"
            />
          </div>
        }
      >
        {/* Dynamic Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search customer, item, or comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-xl px-4 py-2 text-[11px] outline-none focus:border-slate-900 transition-all font-semibold"
          />
        </div>
      </PageHeader>

      {/* Reviews feed */}
      <motion.div variants={fadeUp} className="space-y-4">
        {loading ? (
          <SkeletonDashboard />
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
            const customer = r.user?.name || 'Bespoke Customer';
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
                          ({r.user?.email})
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
                        onClick={() => handleModerate(r._id, 'approve')}
                        className="admin-btn admin-btn-ghost admin-btn-sm group !bg-emerald-600 !text-white !border-emerald-600 !py-1.5 !px-3 !text-[11px] sm:text-[11px] flex items-center gap-1.5 cursor-pointer rounded-lg hover:brightness-110 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        Approve & Pay ₹20 Reward
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
                    <span className="text-[11px] text-[var(--admin-success)] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">verified</span>
                      Approved and cash disbursed
                    </span>
                  )}

                  {r.status === 'rejected' && (
                    <span className="text-[11px] text-[var(--admin-error)] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">block</span>
                      Review rejected from listing feed
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
