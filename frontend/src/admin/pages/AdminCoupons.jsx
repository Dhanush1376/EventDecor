import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { couponService } from '../../services/domainServices';
import { useConfirm } from '../../context/ConfirmProvider';
import toast from 'react-hot-toast';
import {
  PageHeader,
  AdminToggle,
  AdminStatusPill,
  EmptyState,
  fadeUp,
  stagger,
  AdminCouponsSkeleton,
  AdminCouponCardsSkeleton,
} from '../components/AdminUIKit';

export function AdminCoupons() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [statusTab, setStatusTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: coupons = [], isLoading: loading } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: async () => {
      const res = await couponService.getAll();
      if (!res.success) throw new Error('Failed to load discount coupons');
      return res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
    },
    onError: () => toast.error('Failed to load discount coupons'),
  });

  const getCouponStatus = (c) => {
    const now = new Date();
    if (now > new Date(c.expiryDate)) return 'EXPIRED';
    if (now < new Date(c.startDate)) return 'UPCOMING';
    if (!c.isActive) return 'INACTIVE';
    return 'ACTIVE';
  };

  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      All: coupons.length,
      Active: coupons.filter((c) => c.isActive && now <= new Date(c.expiryDate)).length,
      Inactive: coupons.filter((c) => !c.isActive && now <= new Date(c.expiryDate)).length,
      Expired: coupons.filter((c) => now > new Date(c.expiryDate)).length,
    };
  }, [coupons]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (discountTypeFilter !== 'All') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [discountTypeFilter, sortBy]);

  const filteredCoupons = useMemo(() => {
    return coupons
      .filter((c) => {
        const status = getCouponStatus(c);
        if (statusTab === 'Active' && status !== 'ACTIVE') return false;
        if (statusTab === 'Inactive' && status !== 'INACTIVE') return false;
        if (statusTab === 'Expired' && status !== 'EXPIRED') return false;

        if (discountTypeFilter !== 'All' && c.discountType !== discountTypeFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = c.code?.toLowerCase().includes(q);
          const matchType = c.discountType?.toLowerCase().includes(q);
          const matchDesc = (c.description || '').toLowerCase().includes(q);
          if (!matchCode && !matchType && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === 'expiring-soon')
          return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
        if (sortBy === 'discount-desc') return (b.discountValue || 0) - (a.discountValue || 0);
        if (sortBy === 'code-asc') return (a.code || '').localeCompare(b.code || '');
        return 0;
      });
  }, [coupons, statusTab, discountTypeFilter, searchQuery, sortBy]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => couponService.update(id, { isActive }),
    onSuccess: (_, variables) => {
      toast.success(`Coupon ${variables.isActive ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
    },
    onError: () => toast.error('Failed to update coupon status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couponService.delete(id),
    onSuccess: () => {
      toast.success('Coupon deleted');
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
    },
    onError: () => toast.error('Failed to delete coupon'),
  });

  const handleToggleActive = (id, currentStatus) => {
    toggleMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDelete = async (id) => {
    if (
      !(await confirm({
        title: 'Delete Coupon',
        message: 'Are you sure you want to permanently delete this coupon?',
        type: 'danger',
      }))
    )
      return;
    deleteMutation.mutate(id);
  };

  if (loading && coupons.length === 0) {
    return <AdminCouponsSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8"
    >
      {/* Header: Title and Live Badges */}
      <PageHeader
        title="Coupons & Offers"
        subtitle={
          loading ? (
            <span>Loading coupons...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {coupons.length} Total Coupons
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {tabCounts.Active || 0} Active
              </span>
              {(tabCounts.Inactive || 0) > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-stone-600 dark:text-stone-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  {tabCounts.Inactive} Inactive
                </span>
              )}
              {(tabCounts.Expired || 0) > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {tabCounts.Expired} Expired
                </span>
              )}
            </div>
          )
        }
      />

      {/* Sticky 42px Search & Controls Bar - exactly like Orders / Products / Showcase */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-5">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupons by code, type, or description..."
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
              {['All', 'Active', 'Inactive', 'Expired'].map((tab) => {
                const isActive = statusTab === tab;
                const count = tabCounts[tab] || 0;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusTab(tab)}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3 rounded-[3px] text-[12px] font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap box-border ${
                      isActive
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span>{tab}</span>
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

            {/* Filters Button & Popover */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeFiltersCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Coupon Filters"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} Filters` : 'Filters'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showFiltersMenu && (
                  <>
                    <div
                      onClick={() => setShowFiltersMenu(false)}
                      className="fixed inset-0 z-[120] bg-black/30 sm:bg-transparent"
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed sm:absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] w-auto sm:w-72 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[8px] shadow-2xl p-4 z-[130] space-y-4"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border)]">
                        <span className="font-bold text-[13px] text-[var(--admin-text-primary)] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                            tune
                          </span>
                          Filter Coupons
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFiltersMenu(false)}
                          className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] p-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>

                      {/* Status (for mobile where pill bar is hidden) */}
                      <div className="block sm:hidden">
                        <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                          Status
                        </label>
                        <select
                          value={statusTab}
                          onChange={(e) => setStatusTab(e.target.value)}
                          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                        >
                          <option value="All">All ({tabCounts.All})</option>
                          <option value="Active">Active ({tabCounts.Active})</option>
                          <option value="Inactive">Inactive ({tabCounts.Inactive})</option>
                          <option value="Expired">Expired ({tabCounts.Expired})</option>
                        </select>
                      </div>

                      {/* Discount Type */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                          Discount Type
                        </label>
                        <select
                          value={discountTypeFilter}
                          onChange={(e) => setDiscountTypeFilter(e.target.value)}
                          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                        >
                          <option value="All">All Discount Types</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="flat">Flat Amount (₹)</option>
                        </select>
                      </div>

                      {/* Sort By */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                        >
                          <option value="newest">Newest First</option>
                          <option value="expiring-soon">Expiring Soonest</option>
                          <option value="discount-desc">Highest Discount</option>
                          <option value="code-asc">Code (A → Z)</option>
                        </select>
                      </div>

                      <div className="pt-2 border-t border-[var(--admin-border)] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusTab('All');
                            setDiscountTypeFilter('All');
                            setSortBy('newest');
                            setSearchQuery('');
                          }}
                          className="text-[11px] font-semibold text-[var(--admin-text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFiltersMenu(false)}
                          className="admin-btn-primary px-4 py-2 !rounded-[4px] text-[12px]"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Create Coupon Button */}
            <button
              type="button"
              onClick={() => navigate('/admin/coupons/create')}
              className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Create Coupon"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Create Coupon</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Loading & Empty State */}
      {loading ? (
        <AdminCouponCardsSkeleton />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon="sell"
          title="No Coupons"
          description="No coupons exist. Create some to attract customers."
          action={
            <button
              onClick={() => navigate('/admin/coupons/create')}
              className="admin-btn admin-btn-primary admin-btn-sm rounded-[4px]"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create Coupon
            </button>
          }
        />
      ) : filteredCoupons.length === 0 ? (
        <motion.div variants={fadeUp} className="admin-card py-16 flex justify-center">
          <EmptyState
            icon="search_off"
            title="No Coupons Found"
            description="No coupons match the selected search or filter criteria."
            action={
              <button
                onClick={() => {
                  setStatusTab('All');
                  setDiscountTypeFilter('All');
                  setSearchQuery('');
                  setSortBy('newest');
                }}
                className="admin-btn admin-btn-outline"
              >
                Clear Filters
              </button>
            }
          />
        </motion.div>
      ) : (
        <motion.div
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredCoupons.map((c) => {
            const cId = c._id || c.id;
            const isExpanded = expandedCardIds.has(cId);
            const status = getCouponStatus(c);
            const isExpired = status === 'EXPIRED';
            const hasLimit = c.usageLimit && c.usageLimit > 0;
            const remaining = hasLimit ? Math.max(0, c.usageLimit - c.usedCount) : '∞';
            const percentUsed = hasLimit ? Math.round((c.usedCount / c.usageLimit) * 100) : 0;

            const now = new Date();
            const expDate = new Date(c.expiryDate);
            const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

            return (
              <motion.div
                key={cId}
                variants={fadeUp}
                onClick={() => navigate(`/admin/coupons/edit/${cId}`)}
                className="relative overflow-hidden rounded-[8px] p-3.5 shadow-xs border border-stone-200/90 dark:border-stone-700/80 bg-white dark:bg-stone-900 flex flex-col gap-3 cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm transition-all"
              >
                {/* Header: Coupon Code + Badges + Status & Toggle */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[15px] font-extrabold text-[var(--admin-text-primary)] tracking-wide truncate">
                        {c.code}
                      </span>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 shrink-0">
                        {c.discountType === 'percentage'
                          ? `${c.discountValue}% OFF`
                          : `₹${c.discountValue} OFF`}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] block mt-0.5 truncate">
                      Min order ₹{c.minOrderAmount?.toLocaleString() || 0}
                      {c.maxDiscount ? ` • Max off ₹${c.maxDiscount}` : ''}
                    </span>
                  </div>

                  {/* Status & Active Toggle Switch */}
                  <div
                    className="flex items-center gap-2 shrink-0 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AdminStatusPill status={status} />
                    <AdminToggle
                      size="sm"
                      checked={c.isActive && !isExpired}
                      onChange={() => handleToggleActive(cId, c.isActive)}
                      disabled={isExpired}
                    />
                  </div>
                </div>

                {/* 3. Offer Snapshot Box */}
                <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[6px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs text-amber-700 dark:text-amber-400">
                    <span className="material-symbols-outlined text-[20px]">
                      {c.discountType === 'percentage' ? 'percent' : 'sell'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                        COUPON OFFER
                      </span>
                      <span className="text-[9px] font-bold text-stone-600 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0 uppercase">
                        {c.discountType === 'percentage' ? 'Percent' : 'Flat'}
                      </span>
                    </div>
                    <p
                      className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                      title={c.description || `${c.discountValue} Off Discount`}
                    >
                      {c.description ||
                        `${c.discountValue}${c.discountType === 'percentage' ? '%' : ' INR'} Storewide Discount`}
                    </p>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      {new Date(c.startDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      to{' '}
                      {new Date(c.expiryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* 4. Usage Metrics & Progress Strip */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-[var(--admin-text-secondary)] font-medium">
                    <span className="flex items-center gap-1">
                      <span>Redeemed:</span>
                      <strong className="text-[var(--admin-text-primary)]">
                        {c.usedCount || 0}
                      </strong>
                      <span className="text-stone-400">/</span>
                      <span>{hasLimit ? c.usageLimit : 'Unlimited'}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border ${
                        isExpired
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : diffDays <= 3
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-50 text-stone-600 border-stone-200 dark:bg-stone-800 dark:border-stone-700'
                      }`}
                    >
                      {isExpired
                        ? 'Expired'
                        : diffDays <= 1
                          ? 'Expires Today'
                          : `${diffDays} days left`}
                    </span>
                  </div>

                  {hasLimit && (
                    <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-stone-200/60 dark:border-stone-700/60">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentUsed >= 90
                            ? 'bg-rose-500'
                            : percentUsed >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, percentUsed)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 5. Symmetrical Action Controls */}
                <div
                  className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/60 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Edit Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/coupons/edit/${cId}`);
                    }}
                    className="w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[4px] bg-[var(--admin-accent)] hover:opacity-90 active:opacity-100 text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Edit Offer</span>
                  </button>

                  {/* Details Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpandCard(cId);
                    }}
                    className={`w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[4px] border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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

                {/* 6. Expandable Details Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key={`coupon-card-expanded-${cId}`}
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
                        {/* Rules & Limits 4-Box Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[4px] border border-stone-200/70 dark:border-stone-700/60">
                            <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                              Min Purchase
                            </span>
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                              ₹{c.minOrderAmount?.toLocaleString() || 0}
                            </span>
                          </div>

                          <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[4px] border border-stone-200/70 dark:border-stone-700/60">
                            <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                              Max Discount Cap
                            </span>
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                              {c.maxDiscount ? `₹${c.maxDiscount}` : 'No Cap'}
                            </span>
                          </div>

                          <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[4px] border border-stone-200/70 dark:border-stone-700/60">
                            <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                              Remaining Uses
                            </span>
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                              {remaining}
                            </span>
                          </div>

                          <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[4px] border border-stone-200/70 dark:border-stone-700/60">
                            <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                              Per-User Limit
                            </span>
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                              {c.userLimit || '1 per user'}
                            </span>
                          </div>
                        </div>

                        {/* Validity Window Callout Box */}
                        <div className="bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-[4px] border border-stone-200/70 dark:border-stone-700/60 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                            <span className="font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                event_available
                              </span>
                              Starts:
                            </span>
                            <span className="font-bold text-stone-800 dark:text-stone-100">
                              {new Date(c.startDate).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                            <span className="font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                event_busy
                              </span>
                              Expires:
                            </span>
                            <span className="font-bold text-stone-800 dark:text-stone-100">
                              {new Date(c.expiryDate).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Footer Actions: Delete Button */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10.5px] text-stone-400">
                            Created:{' '}
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString('en-IN')
                              : 'Standard'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(cId);
                            }}
                            className="h-7 px-2.5 rounded-[4px] border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                            title="Delete coupon"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

export default AdminCoupons;
