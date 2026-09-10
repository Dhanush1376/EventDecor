import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import { useConfirm } from '../../context/ConfirmProvider';
import { customerIntelligenceService } from '../../services/domainServices';
import {
  PageHeader,
  EmptyState,
  AdminStatusPill,
  formatCurrency,
  fadeUp,
  stagger,
  SkeletonCard,
} from '../components/AdminUIKit';
import { formatDistanceToNow } from 'date-fns';
import { EXTERNAL_URLS } from '../../config/constants';
import { getAccessToken } from '../../services/api';
import { getApiRootUrl } from '../../config/apiConfig';
import { acquireAdminSocket, releaseAdminSocket } from '../services/adminSocket';
import AdminCustomerProfileModal from '../components/AdminCustomerProfileModal';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

export function AdminCustomers() {
  const { searchQuery, setSearchQuery } = useAdmin();
  const confirm = useConfirm();

  const [tierFilter, setTierFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  const [, setKpi] = useState(null);
  const [, setKpiLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchCustomers = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await customerIntelligenceService.getCustomers({
        page,
        limit: pageSize,
        search: searchQuery,
        tier: tierFilter === 'All' ? undefined : tierFilter,
      });
      setCustomers(res?.data || []);
      setMeta(res?.meta || {});
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setDataLoading(false);
    }
  }, [page, pageSize, searchQuery, tierFilter]);

  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await customerIntelligenceService.getOverview();
      setKpi(res?.snapshot?.metrics || null);
    } catch (err) {
      console.error('KPI fetch error:', err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = acquireAdminSocket();

    const onCustomerUpdated = () => {
      fetchCustomers();
      fetchKpis();
    };
    const onOrderUpdate = () => {
      fetchCustomers();
      fetchKpis();
    };

    socket.on('customer_updated', onCustomerUpdated);
    socket.on('order_update', onOrderUpdate);

    return () => {
      socket.off('customer_updated', onCustomerUpdated);
      socket.off('order_update', onOrderUpdate);
      releaseAdminSocket();
    };
  }, [fetchCustomers, fetchKpis]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${getApiRootUrl()}/customer-intelligence/customers/export?search=${searchQuery}&tier=${tierFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      if (data.success && data.data) {
        const headers = 'Name,Email,Phone,Orders,Spent,Tier,Joined\n';
        const rows = data.data
          .map(
            (c) =>
              `"${c.Name}","${c.Email}","${c.Phone}",${c.Orders},${c.Spent},"${c.Tier}","${c.Joined}"`,
          )
          .join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `EventDecor_Customers_${new Date().toISOString().slice(0, 10)}.csv`,
        );
        link.click();
        toast.success('Customers export completed');
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCustomer = async (customerToDelete) => {
    if (!customerToDelete?._id) return;

    const confirmed = await confirm({
      title: 'Move Customer to Recycle Bin?',
      message: `Are you sure you want to move "${customerToDelete.name || 'this customer'}" to the recycle bin? Customer access will be revoked, and their record will be safely held in the Recycle Bin for 30 days where it can be restored or permanently removed.`,
      confirmText: 'Move to Recycle Bin',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await customerIntelligenceService.deleteCustomer(
        customerToDelete._id,
        'Moved to recycle bin from Customers dashboard',
      );
      toast.success(`"${customerToDelete.name || 'Customer'}" moved to Recycle Bin`);
      if (selectedCustomerId === customerToDelete._id) {
        setSelectedCustomerId(null);
      }
      fetchCustomers();
      fetchKpis();
    } catch (err) {
      console.error('Failed to soft delete customer:', err);
      toast.error(err?.response?.data?.message || 'Failed to move customer to recycle bin');
    }
  };

  const getTierLabel = (tier) => {
    return (tier || 'BRONZE').toUpperCase();
  };

  const tierCounts = {
    All: meta.total || customers.length,
    Platinum: customers.filter((c) => (c.loyaltyTier || '').toLowerCase() === 'platinum').length,
    Gold: customers.filter((c) => (c.loyaltyTier || '').toLowerCase() === 'gold').length,
    Silver: customers.filter((c) => (c.loyaltyTier || '').toLowerCase() === 'silver').length,
    Bronze: customers.filter(
      (c) => !c.loyaltyTier || (c.loyaltyTier || '').toLowerCase() === 'bronze',
    ).length,
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8"
    >
      <PageHeader
        title="Customers"
        subtitle={
          dataLoading ? (
            <span>Loading customers...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {meta.total !== undefined ? meta.total : customers.length || 0} Total Customers
              </span>
              {tierCounts.Platinum > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  {tierCounts.Platinum} Platinum
                </span>
              )}
              {tierCounts.Gold > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {tierCounts.Gold} Gold
                </span>
              )}
              {tierCounts.Bronze > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {tierCounts.Bronze} Bronze
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
              placeholder="Search customers by name, email, phone, or location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Tier Segmented Pill Switcher (Desktop & Tablet) */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px] min-h-[42px] max-h-[42px] box-border">
              {['All', 'Platinum', 'Gold', 'Silver', 'Bronze'].map((tier) => {
                const isActive = tierFilter === tier;
                const count = tierCounts[tier] || 0;

                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => {
                      setTierFilter(tier);
                      setPage(1);
                    }}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3 rounded-[3px] text-[12px] font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap box-border ${
                      isActive
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span>{tier}</span>
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

            {/* Mobile Tier Select Dropdown */}
            <div className="sm:hidden relative shrink-0">
              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
                  setPage(1);
                }}
                className="h-[42px] px-2.5 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] rounded-[4px] text-[12px] font-semibold outline-none cursor-pointer"
              >
                {['All', 'Platinum', 'Gold', 'Silver', 'Bronze'].map((tier) => (
                  <option key={tier} value={tier}>
                    {tier} ({tierCounts[tier] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px] disabled:opacity-50"
              title="Export Customers CSV"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-spin' : ''}`}
              >
                {isExporting ? 'sync' : 'download'}
              </span>
              <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div
            key="loading"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} className="h-[280px]" />
            ))}
          </motion.div>
        ) : customers.length === 0 ? (
          <motion.div
            key="empty"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card py-16 flex justify-center"
          >
            <EmptyState
              icon={searchQuery || tierFilter !== 'All' ? 'search_off' : 'group'}
              title={searchQuery || tierFilter !== 'All' ? 'No Matches Found' : 'No Customers Yet'}
              description={
                searchQuery || tierFilter !== 'All'
                  ? 'No customers match the search or filter criteria.'
                  : 'When customers create accounts or place orders, they will appear here.'
              }
              action={
                searchQuery || tierFilter !== 'All' ? (
                  <button
                    onClick={() => {
                      setTierFilter('All');
                      setPage(1);
                    }}
                    className="admin-btn admin-btn-outline rounded-[6px]"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="admin-btn admin-btn-outline rounded-[6px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh Page
                  </button>
                )
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {customers.map((c) => {
              const cId = c._id;
              const isExpanded = expandedCardIds.has(cId);
              const tier = c.loyaltyTier || 'Bronze';
              const isVip = c.segment === 'VIP';
              const isNew = c.segment === 'New';
              const initials =
                c.name
                  ?.split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'CU';

              const customerCity =
                (c.city && !['unknown', 'unknown city'].includes(c.city.toLowerCase())
                  ? c.city
                  : null) ||
                c.addresses?.find(
                  (a) => a.city && !['unknown', 'unknown city'].includes(a.city.toLowerCase()),
                )?.city ||
                (c.shippingAddress?.city &&
                !['unknown', 'unknown city'].includes(c.shippingAddress.city.toLowerCase())
                  ? c.shippingAddress.city
                  : null) ||
                (c.location &&
                !['unknown', 'unknown city', 'location unknown'].includes(c.location.toLowerCase())
                  ? c.location
                  : null) ||
                (c.state ? `${c.state}` : null) ||
                null;

              return (
                <motion.div
                  key={cId}
                  variants={fadeUp}
                  className="relative overflow-hidden rounded-[8px] p-3.5 shadow-xs border border-stone-200/90 dark:border-stone-700/80 bg-white dark:bg-stone-900 flex flex-col gap-3 transition-all hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm"
                >
                  {/* Header: Name + Badges + Subtitle + Tier Status Pill */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[var(--admin-text-primary)] text-[14px] truncate">
                          {c.name || 'Anonymous Customer'}
                        </span>

                        {isVip && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                            VIP
                          </span>
                        )}

                        {isNew && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] block mt-0.5 truncate">
                        {customerCity || 'Location not specified'} {c.email ? `• ${c.email}` : ''}
                      </span>
                    </div>
                    <AdminStatusPill
                      status={tier}
                      label={getTierLabel(tier)}
                      className="shrink-0"
                    />
                  </div>

                  {/* 3. Customer Profile & Wallet Snapshot Box */}
                  <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[6px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs font-extrabold text-amber-700 dark:text-amber-400 text-[13px]">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                          CUSTOMER WALLET
                        </span>
                        <span className="text-[9px] font-bold text-stone-600 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0 uppercase">
                          {tier} Tier
                        </span>
                      </div>
                      <p className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5">
                        Balance: {formatCurrency(c.walletBalance || 0)}
                        <span className="ml-1.5 font-semibold text-amber-600 dark:text-amber-400">
                          ({c.siriCoins || 0} Coins)
                        </span>
                      </p>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        {c.lastLogin
                          ? `Active ${formatDistanceToNow(new Date(c.lastLogin), { addSuffix: true })}`
                          : 'New Member'}
                        {c.health ? ` • Health: ${c.health}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* 4. Financial Total Spent & Orders Strip */}
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                        Total Spent:
                      </span>
                      <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px]">
                        {formatCurrency(c.totalSpent || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <span className="material-symbols-outlined text-[11px]">shopping_bag</span>
                        {c.orders || 0} Order{c.orders === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* 5. Symmetrical Action Controls (Equal 36px Height, 6px Radius) */}
                  <div
                    className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/60 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Box 1: Quick View Profile Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cId);
                      }}
                      className="w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[6px] bg-[var(--admin-accent)] hover:opacity-90 active:opacity-100 text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Quick View</span>
                    </button>

                    {/* Box 2: Details Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandCard(cId);
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

                  {/* 6. Expandable Details Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key={`customer-card-expanded-${cId}`}
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
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={`tel:${c.phone || ''}`}
                              onClick={(e) => {
                                if (!c.phone) {
                                  e.preventDefault();
                                  toast.error('No phone number recorded');
                                }
                              }}
                              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[6px] border border-stone-200 dark:border-stone-700 bg-[#FAF9F5] dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-semibold hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                            >
                              <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-500 shrink-0">
                                call
                              </span>
                              <span className="truncate">{c.phone || 'No phone'}</span>
                            </a>

                            <a
                              href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(c.phone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!c.phone) {
                                  e.preventDefault();
                                  toast.error('No phone number recorded');
                                }
                              }}
                              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[6px] border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 transition-colors"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>WhatsApp</span>
                            </a>
                          </div>

                          {/* Customer Stats 4-Box Grid */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60">
                              <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                                Total Orders
                              </span>
                              <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                                {c.orders || 0}
                              </span>
                            </div>

                            <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60">
                              <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                                Lifetime Spent
                              </span>
                              <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(c.totalSpent || 0)}
                              </span>
                            </div>

                            <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60">
                              <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                                Wallet Cash
                              </span>
                              <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                                {formatCurrency(c.walletBalance || 0)}
                              </span>
                            </div>

                            <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60">
                              <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                                Reward Coins
                              </span>
                              <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                                {c.siriCoins || 0}
                              </span>
                            </div>
                          </div>

                          {/* Account & Location Info Callout */}
                          <div className="bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                              <span className="font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                  mail
                                </span>
                                Email:
                              </span>
                              <span className="font-bold text-stone-800 dark:text-stone-100 truncate max-w-[180px]">
                                {c.email || 'None'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                              <span className="font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                  location_on
                                </span>
                                City:
                              </span>
                              <span className="font-bold text-stone-800 dark:text-stone-100">
                                {customerCity || 'Not specified'}
                              </span>
                            </div>
                          </div>

                          {/* Footer Actions: Email Link & Delete Button */}
                          <div className="flex items-center justify-between pt-1">
                            {c.email ? (
                              <a
                                href={`mailto:${c.email}`}
                                className="h-7 px-2.5 rounded-[5px] border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-stone-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[13px]">mail</span>
                                Email
                              </a>
                            ) : (
                              <span className="text-[10px] text-stone-400">No email</span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomer(c);
                              }}
                              className="h-7 px-2.5 rounded-[5px] border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                              title="Move customer to recycle bin"
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
      </AnimatePresence>

      {/* Pagination Controls */}
      {!dataLoading && (meta.pages > 1 || customers.length > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-[var(--admin-border-subtle)]">
          <div className="text-xs text-[var(--admin-text-secondary)]">
            Showing{' '}
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {customers.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {meta.total || customers.length}
            </span>{' '}
            customers
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)]">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded px-2 py-1 text-xs font-semibold text-[var(--admin-text-primary)] outline-none cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {meta.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs disabled:opacity-50 cursor-pointer rounded-[6px]"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-[var(--admin-text-secondary)] px-1">
                  Page {page} of {meta.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                  disabled={page === meta.pages}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs disabled:opacity-50 cursor-pointer rounded-[6px]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Profile */}
      <AnimatePresence>
        {selectedCustomerId && (
          <AdminCustomerProfileModal
            customer={customers.find((c) => c._id === selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            onDelete={handleDeleteCustomer}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
