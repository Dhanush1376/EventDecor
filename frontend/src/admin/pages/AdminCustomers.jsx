import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmProvider';
import { customerIntelligenceService } from '../../services/domainServices';
import {
  PageHeader,
  EmptyState,
  stagger,
  fadeUp,
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { AdminActiveFilterChips } from '../components/filters/AdminActiveFilterChips';
import { AdminCustomerDetailDrawer } from '../components/AdminCustomerDetailDrawer';
import { getAccessToken } from '../../services/api';
import { acquireAdminSocket, releaseAdminSocket } from '../services/adminSocket';

export function AdminCustomers() {
  const navigate = useNavigate();
  const { customerId: routeCustomerId } = useParams();
  const [searchParams] = useSearchParams();
  const queryCustomerId =
    routeCustomerId || searchParams.get('id') || searchParams.get('customerId');

  const confirm = useConfirm();

  // Core Data States
  const [customers, setCustomers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  // Selection state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Search & Filters state (Orders page UI style)
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [filterState, setFilterState] = useState({
    tier: 'all',
    wishlist: 'all',
    cart: 'all',
    orders: 'all',
    minSpend: '',
    maxSpend: '',
  });
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (queryCustomerId) {
      setSelectedCustomerId(queryCustomerId);
    }
  }, [queryCustomerId]);

  // Fetch Customers with marketing & cart metrics
  const fetchCustomers = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await customerIntelligenceService.getCustomers({
        page: pagination.page,
        limit: pagination.limit,
      });

      const list = res?.data || [];
      const fetchedCustomers = list.map((c) => ({
        ...c,
        ordersCount: c.ordersCount ?? c.orders ?? 0,
        totalSpent: c.totalSpent || 0,
        cartItemsCount: c.cartItemsCount ?? c.cartCount ?? (c.cart?.length || 0),
        wishlistItemsCount: c.wishlistItemsCount ?? c.wishlistCount ?? (c.wishlist?.length || 0),
      }));

      setCustomers(fetchedCustomers);
      setPagination((prev) => ({
        ...prev,
        total: res?.meta?.total || fetchedCustomers.length,
        pages: res?.meta?.pages || 1,
      }));
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setDataLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Real-time socket integration
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = acquireAdminSocket();
    const onCustomerUpdated = () => {
      fetchCustomers();
    };
    const onOrderUpdate = () => {
      fetchCustomers();
    };

    socket.on('customer_updated', onCustomerUpdated);
    socket.on('order_update', onOrderUpdate);

    return () => {
      socket.off('customer_updated', onCustomerUpdated);
      socket.off('order_update', onOrderUpdate);
      releaseAdminSocket();
    };
  }, [fetchCustomers]);

  // Dynamic filter & sort
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || city.includes(q);
      });
    }

    // 2. Loyalty Tier
    if (filterState.tier !== 'all') {
      result = result.filter(
        (c) => (c.loyaltyTier || 'bronze').toLowerCase() === filterState.tier.toLowerCase(),
      );
    }

    // 3. Wishlist Status
    if (filterState.wishlist === 'has_wishlist') {
      result = result.filter(
        (c) => (c.wishlistItemsCount ?? c.wishlistCount ?? c.wishlist?.length ?? 0) > 0,
      );
    } else if (filterState.wishlist === 'empty_wishlist') {
      result = result.filter(
        (c) => (c.wishlistItemsCount ?? c.wishlistCount ?? c.wishlist?.length ?? 0) === 0,
      );
    }

    // 4. Cart Status
    if (filterState.cart === 'has_cart') {
      result = result.filter((c) => (c.cartItemsCount ?? c.cart?.length ?? 0) > 0);
    } else if (filterState.cart === 'empty_cart') {
      result = result.filter((c) => (c.cartItemsCount ?? c.cart?.length ?? 0) === 0);
    }

    // 5. Orders Count / Segment
    if (filterState.orders === 'repeat') {
      result = result.filter((c) => (c.ordersCount ?? c.orders ?? 0) > 1);
    } else if (filterState.orders === 'first_time') {
      result = result.filter((c) => (c.ordersCount ?? c.orders ?? 0) === 1);
    } else if (filterState.orders === 'prospect') {
      result = result.filter((c) => (c.ordersCount ?? c.orders ?? 0) === 0);
    }

    // 6. Spend Range
    if (filterState.minSpend !== '' && !isNaN(Number(filterState.minSpend))) {
      result = result.filter((c) => (c.totalSpent || 0) >= Number(filterState.minSpend));
    }
    if (filterState.maxSpend !== '' && !isNaN(Number(filterState.maxSpend))) {
      result = result.filter((c) => (c.totalSpent || 0) <= Number(filterState.maxSpend));
    }

    // 7. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'spend_high':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'spend_low':
          return (a.totalSpent || 0) - (b.totalSpent || 0);
        case 'most_orders':
          return (b.ordersCount ?? b.orders ?? 0) - (a.ordersCount ?? a.orders ?? 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return result;
  }, [customers, searchQuery, filterState, sortBy]);

  // Active Filter Chips calculation
  const activeChips = useMemo(() => {
    const chips = [];
    if (filterState.tier !== 'all') {
      chips.push({
        key: 'tier',
        label: `Tier: ${filterState.tier.toUpperCase()}`,
        onRemove: () => setFilterState((prev) => ({ ...prev, tier: 'all' })),
      });
    }
    if (filterState.wishlist !== 'all') {
      chips.push({
        key: 'wishlist',
        label: `Wishlist: ${filterState.wishlist === 'has_wishlist' ? 'Has Items' : 'Empty'}`,
        onRemove: () => setFilterState((prev) => ({ ...prev, wishlist: 'all' })),
      });
    }
    if (filterState.cart !== 'all') {
      chips.push({
        key: 'cart',
        label: `Cart: ${filterState.cart === 'has_cart' ? 'Active Cart' : 'Empty Cart'}`,
        onRemove: () => setFilterState((prev) => ({ ...prev, cart: 'all' })),
      });
    }
    if (filterState.orders !== 'all') {
      chips.push({
        key: 'orders',
        label: `Orders: ${
          filterState.orders === 'repeat'
            ? 'Repeat'
            : filterState.orders === 'first_time'
              ? '1st Time'
              : 'Prospect'
        }`,
        onRemove: () => setFilterState((prev) => ({ ...prev, orders: 'all' })),
      });
    }
    if (filterState.minSpend !== '' || filterState.maxSpend !== '') {
      chips.push({
        key: 'spend',
        label: `Spend: ₹${filterState.minSpend || '0'} - ₹${filterState.maxSpend || '∞'}`,
        onRemove: () => setFilterState((prev) => ({ ...prev, minSpend: '', maxSpend: '' })),
      });
    }
    return chips;
  }, [filterState]);

  const activeCount = activeChips.length;

  const resetAllFilters = () => {
    setFilterState({
      tier: 'all',
      wishlist: 'all',
      cart: 'all',
      orders: 'all',
      minSpend: '',
      maxSpend: '',
    });
    setSearchQuery('');
    setSortBy('newest');
  };

  // Multi-select helpers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomerIds(filteredCustomers.map((c) => c._id));
    } else {
      setSelectedCustomerIds([]);
    }
  };

  const handleSelectCustomer = (id) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Name',
        'Email',
        'Phone',
        'City',
        'Loyalty Tier',
        'Total Spend (₹)',
        'Orders Count',
        'Cart Items',
        'Wishlist Items',
        'Joined Date',
      ];
      const rows = filteredCustomers.map((c) => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.city || '').replace(/"/g, '""')}"`,
        (c.loyaltyTier || 'Bronze').toUpperCase(),
        c.totalSpent || 0,
        c.ordersCount ?? c.orders ?? 0,
        c.cartItemsCount ?? c.cartCount ?? (c.cart?.length || 0),
        c.wishlistItemsCount ?? c.wishlistCount ?? (c.wishlist?.length || 0),
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `customers_export_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${filteredCustomers.length} customers to CSV`);
    } catch {
      toast.error('Failed to export customers to CSV');
    }
  };

  // Delete / Soft Delete customer
  const handleDeleteCustomer = async (customerToDelete) => {
    if (!customerToDelete?._id) return;

    const confirmed = await confirm({
      title: 'Move Customer to Recycle Bin?',
      message: `Are you sure you want to move "${customerToDelete.name || 'this customer'}" to the recycle bin? Customer access will be revoked, and their record will be held for 30 days in the Recycle Bin.`,
      confirmText: 'Move to Recycle Bin',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await customerIntelligenceService.deleteCustomer(
        customerToDelete._id,
        'Moved to recycle bin from Customers page',
      );
      toast.success(`"${customerToDelete.name || 'Customer'}" moved to Recycle Bin`);
      if (selectedCustomerId === customerToDelete._id) {
        setSelectedCustomerId(null);
      }
      setSelectedCustomerIds((prev) => prev.filter((id) => id !== customerToDelete._id));
      fetchCustomers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to move customer to recycle bin');
    }
  };

  const getTierBadgeStyle = (tier) => {
    const t = (tier || 'BRONZE').toUpperCase();
    switch (t) {
      case 'PLATINUM':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700';
      case 'GOLD':
        return 'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-700';
      case 'SILVER':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'BRONZE':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-4 sm:space-y-5 pb-14 sm:pb-8"
    >
      {/* ─── Page Header (Orders Page Style) ─── */}
      <PageHeader
        title="Customers"
        subtitle={
          dataLoading ? (
            <div className="flex items-center gap-2 animate-pulse py-0.5">
              <div className="w-28 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
              <div className="w-20 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
              <div className="w-20 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] sm:text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {customers.length} Total Customers
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {
                  customers.filter(
                    (c) => (c.wishlistItemsCount ?? c.wishlistCount ?? c.wishlist?.length ?? 0) > 0,
                  ).length
                }{' '}
                Active Wishlists
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {
                  customers.filter(
                    (c) => (c.cartItemsCount ?? c.cartCount ?? c.cart?.length ?? 0) > 0,
                  ).length
                }{' '}
                Active Carts
              </span>
            </div>
          )
        }
      />

      {/* ─── STICKY SEARCH & ACTIONS BAR (Orders Page UI Style) ─── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-2 sm:mb-4">
        <div className="relative w-full min-h-[42px]">
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
                placeholder="Search customers by name, email, phone, or city..."
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Action Controls Group */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Filters Button & Drawer */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                  className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                    showFiltersMenu || activeCount > 0
                      ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm'
                      : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                  }`}
                  title="Customer Filters"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span className="font-semibold text-[13px] hidden sm:inline">
                    {activeCount > 0 ? `${activeCount} Filters` : 'Filters'}
                  </span>
                  {activeCount > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>

                <AdminFilterDrawer
                  isOpen={showFiltersMenu}
                  onClose={() => setShowFiltersMenu(false)}
                  title="Filter Customers"
                  icon="tune"
                  activeCount={activeCount}
                  onClearAll={resetAllFilters}
                  clearAllLabel="Reset"
                  onApply={() => setShowFiltersMenu(false)}
                >
                  {/* 1. Loyalty Tier */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Loyalty Tier
                    </label>
                    <select
                      value={filterState.tier}
                      onChange={(e) =>
                        setFilterState((prev) => ({ ...prev, tier: e.target.value }))
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="all">All Loyalty Tiers</option>
                      <option value="platinum">Platinum Tier</option>
                      <option value="gold">Gold Tier</option>
                      <option value="silver">Silver Tier</option>
                      <option value="bronze">Bronze Tier</option>
                    </select>
                  </div>

                  {/* 2. Wishlist Activity */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Wishlist Activity
                    </label>
                    <select
                      value={filterState.wishlist}
                      onChange={(e) =>
                        setFilterState((prev) => ({ ...prev, wishlist: e.target.value }))
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="all">All Wishlist Statuses</option>
                      <option value="has_wishlist">Has Saved Items in Wishlist</option>
                      <option value="empty_wishlist">Wishlist Empty</option>
                    </select>
                  </div>

                  {/* 3. Shopping Cart Activity */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Shopping Cart Activity
                    </label>
                    <select
                      value={filterState.cart}
                      onChange={(e) =>
                        setFilterState((prev) => ({ ...prev, cart: e.target.value }))
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="all">All Cart Statuses</option>
                      <option value="has_cart">Has Unpurchased Items in Cart</option>
                      <option value="empty_cart">Cart Empty</option>
                    </select>
                  </div>

                  {/* 4. Customer Segment */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Customer Lifecycle Segment
                    </label>
                    <select
                      value={filterState.orders}
                      onChange={(e) =>
                        setFilterState((prev) => ({ ...prev, orders: e.target.value }))
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="all">All Customer Accounts</option>
                      <option value="repeat">Repeat Buyers (&gt; 1 Order)</option>
                      <option value="first_time">First-Time Buyers (1 Order)</option>
                      <option value="prospect">Leads / Prospects (0 Orders)</option>
                    </select>
                  </div>

                  {/* 5. Lifetime Spend Range (₹) */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Lifetime Spend Range (₹)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min ₹"
                        value={filterState.minSpend}
                        onChange={(e) =>
                          setFilterState((prev) => ({ ...prev, minSpend: e.target.value }))
                        }
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none text-[var(--admin-text-primary)]"
                      />
                      <input
                        type="number"
                        placeholder="Max ₹"
                        value={filterState.maxSpend}
                        onChange={(e) =>
                          setFilterState((prev) => ({ ...prev, maxSpend: e.target.value }))
                        }
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none text-[var(--admin-text-primary)]"
                      />
                    </div>
                  </div>

                  {/* 6. Sort Order */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Sort Order
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="newest">Newest Members First</option>
                      <option value="oldest">Oldest Members First</option>
                      <option value="spend_high">Lifetime Spend: High to Low</option>
                      <option value="spend_low">Lifetime Spend: Low to High</option>
                      <option value="most_orders">Most Orders</option>
                    </select>
                  </div>
                </AdminFilterDrawer>
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
                title="Export Customers CSV"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </motion.div>

          {/* ─── Overlapped Multi-Select Banner (Overlaps the search bar directly) ─── */}
          <AnimatePresence>
            {selectedCustomerIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex items-center justify-between gap-3 bg-[var(--admin-surface)] px-3 sm:px-4 rounded-[4px] border border-[var(--admin-accent)] shadow-sm"
              >
                <div className="text-[13px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
                    check_circle
                  </span>
                  <span className="truncate">
                    {selectedCustomerIds.length} Customer
                    {selectedCustomerIds.length === 1 ? '' : 's'} Selected
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerIds([])}
                    className="h-[34px] px-2.5 sm:px-3 text-[12px] font-semibold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer underline underline-offset-2"
                  >
                    Clear Selection
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          totalCount={customers.length}
          matchCount={filteredCustomers.length}
          onClearAll={resetAllFilters}
          itemName="customers"
          className="mt-2 mb-1"
        />
      </div>

      {/* ─── Desktop & Laptop Table View ─── */}
      <div className="hidden md:block admin-card overflow-x-auto">
        <table className="admin-table admin-table-compact w-full text-left text-[13px]">
          <thead className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] border-b border-[var(--admin-border)] text-[11px] font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3 w-10">
                <input
                  type="checkbox"
                  checked={
                    filteredCustomers.length > 0 &&
                    selectedCustomerIds.length === filteredCustomers.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded-[3px] accent-[var(--admin-accent)] cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3">Tier</th>
              <th className="py-3 px-3">Lifetime Spend</th>
              <th className="py-3 px-3">Orders</th>
              <th className="py-3 px-3">Cart Status</th>
              <th className="py-3 px-3">Wishlist</th>
              <th className="py-3 px-4 text-left">Customer 360</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-subtle)]">
            {dataLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3.5 px-3">
                    <div className="w-4 h-4 bg-stone-200 dark:bg-stone-800 rounded-[3px]" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-32 h-4 bg-stone-200 dark:bg-stone-800 rounded mb-1.5" />
                    <div className="w-44 h-3 bg-stone-100 dark:bg-stone-800/60 rounded" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-16 h-5 bg-stone-100 dark:bg-stone-800 rounded-full" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-20 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-8 h-4 bg-stone-100 dark:bg-stone-800 rounded" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-20 h-4 bg-stone-100 dark:bg-stone-800 rounded" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-20 h-5 bg-stone-100 dark:bg-stone-800 rounded-full" />
                  </td>
                  <td className="py-3.5 px-4 text-left">
                    <div className="w-20 h-4 bg-stone-100 dark:bg-stone-800 rounded" />
                  </td>
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <EmptyState
                    icon="group"
                    title="No Customer Accounts Yet"
                    description="When customers register or place orders, they will appear here."
                  />
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center">
                  <EmptyState
                    icon="search_off"
                    title="No Matching Customers Found"
                    description="Try adjusting your search keywords or filter criteria."
                    action={
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="admin-btn admin-btn-outline px-3 h-8 text-xs cursor-pointer mt-2"
                      >
                        Reset All Filters
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomerIds.includes(cust._id);
                const tier = (cust.loyaltyTier || 'Bronze').toUpperCase();
                const ordersCount = cust.ordersCount ?? cust.orders ?? 0;
                const cartCount = cust.cartItemsCount ?? cust.cartCount ?? (cust.cart?.length || 0);
                const wishlistCount =
                  cust.wishlistItemsCount ?? cust.wishlistCount ?? (cust.wishlist?.length || 0);

                return (
                  <tr
                    key={cust._id}
                    onClick={() => setSelectedCustomerId(cust._id)}
                    className="hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleSelectCustomer(cust._id)}
                        className="rounded-[3px] accent-[var(--admin-accent)] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <div
                        onClick={() => setSelectedCustomerId(cust._id)}
                        className="font-bold text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] cursor-pointer transition-colors"
                      >
                        {cust.name || 'Valued Customer'}
                      </div>
                      <div className="text-[11px] text-[var(--admin-text-secondary)] font-mono">
                        {cust.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${getTierBadgeStyle(
                          tier,
                        )}`}
                      >
                        {tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[var(--admin-text-primary)] font-mono">
                      ₹{(cust.totalSpent || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-[var(--admin-text-secondary)] font-mono">
                      {ordersCount}
                    </td>
                    <td className="py-3.5 px-3">
                      {cartCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-2xs bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                          title={`${cartCount} item(s) in active cart`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            shopping_cart
                          </span>
                          <span>
                            {cartCount} {cartCount === 1 ? 'Item' : 'Items'}
                          </span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-2xs bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
                          title="Cart is empty"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            remove_shopping_cart
                          </span>
                          <span>Empty</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {wishlistCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-2xs bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          title={`${wishlistCount} item(s) saved in customer wishlist`}
                        >
                          <span className="material-symbols-outlined text-[13px]">favorite</span>
                          <span>
                            {wishlistCount} {wishlistCount === 1 ? 'Item' : 'Items'}
                          </span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shadow-2xs bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
                          title="Wishlist is empty"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            favorite_border
                          </span>
                          <span>Empty</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(cust._id)}
                          className="text-[12px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center justify-start gap-1"
                        >
                          <span>Journey Log</span>
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile & Tablet Responsive Touch Cards ─── */}
      <div className="flex md:hidden flex-col gap-3 px-0.5 py-1">
        {dataLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="admin-card p-4 space-y-3 border border-stone-200 dark:border-stone-800 animate-pulse bg-white dark:bg-[#211f1b]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-4 h-4 rounded-[3px] bg-stone-200 dark:bg-stone-800 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-28 h-4 bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="w-40 h-3 bg-stone-100 dark:bg-stone-800/60 rounded" />
                  </div>
                </div>
                <div className="w-16 h-5 rounded-[4px] bg-stone-200 dark:bg-stone-800 shrink-0" />
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-stone-100/60 dark:bg-stone-800/40 rounded-[4px] text-center">
                <div className="space-y-1">
                  <div className="w-10 h-2.5 mx-auto bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="w-14 h-4 mx-auto bg-stone-200 dark:bg-stone-700 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="w-10 h-2.5 mx-auto bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="w-8 h-4 mx-auto bg-stone-200 dark:bg-stone-700 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="w-10 h-2.5 mx-auto bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="w-12 h-4 mx-auto bg-stone-200 dark:bg-stone-700 rounded" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800">
                <div className="w-20 h-4 bg-stone-200 dark:bg-stone-700 rounded" />
                <div className="w-24 h-4 bg-stone-200 dark:bg-stone-700 rounded" />
              </div>
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center admin-card">
            <EmptyState
              icon="group"
              title="No Customer Accounts Yet"
              description="When customers register or place orders, they will appear here."
            />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center admin-card">
            <EmptyState
              icon="search_off"
              title="No Matching Customers Found"
              description="Try adjusting your search keywords or filter criteria."
              action={
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs cursor-pointer mt-2"
                >
                  Reset All Filters
                </button>
              }
            />
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isSelected = selectedCustomerIds.includes(cust._id);
            const tier = (cust.loyaltyTier || 'Bronze').toUpperCase();
            const ordersCount = cust.ordersCount ?? cust.orders ?? 0;
            const cartCount = cust.cartItemsCount ?? cust.cartCount ?? (cust.cart?.length || 0);
            const wishlistCount =
              cust.wishlistItemsCount ?? cust.wishlistCount ?? (cust.wishlist?.length || 0);

            return (
              <div
                key={cust._id}
                onClick={() => setSelectedCustomerId(cust._id)}
                className={`admin-card p-4 space-y-3 border transition-all shadow-xs cursor-pointer hover:border-[var(--admin-accent)]/70 ${
                  isSelected
                    ? 'border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)]'
                    : 'border-[var(--admin-border)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectCustomer(cust._id)}
                      className="rounded-[3px] accent-[var(--admin-accent)] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] truncate">
                        {cust.name || 'Valued Customer'}
                      </div>
                      <div className="text-[11px] text-[var(--admin-text-secondary)] font-mono truncate">
                        {cust.email}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-[4px] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border shrink-0 ${getTierBadgeStyle(
                      tier,
                    )}`}
                  >
                    {tier}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)] text-center">
                  <div>
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Spend
                    </div>
                    <div className="text-[13px] font-bold font-mono text-[var(--admin-text-primary)] mt-0.5">
                      ₹{(cust.totalSpent || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Orders
                    </div>
                    <div className="text-[13px] font-bold font-mono text-[var(--admin-text-secondary)] mt-0.5">
                      {ordersCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Cart Status
                    </div>
                    <div className="mt-1 flex justify-center">
                      {cartCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[9.5px] font-bold uppercase border bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700">
                          <span className="material-symbols-outlined text-[12px]">
                            shopping_cart
                          </span>
                          <span>{cartCount} in cart</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[9.5px] font-bold uppercase border bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700">
                          <span className="material-symbols-outlined text-[12px]">
                            remove_shopping_cart
                          </span>
                          <span>Empty</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)] text-[11.5px]">
                  {wishlistCount > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border shadow-2xs bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                      title={`${wishlistCount} item(s) saved in wishlist`}
                    >
                      <span className="material-symbols-outlined text-[12px]">favorite</span>
                      <span>
                        {wishlistCount} {wishlistCount === 1 ? 'ITEM' : 'ITEMS'} IN WISHLIST
                      </span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border shadow-2xs bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
                      title="Wishlist is empty"
                    >
                      <span className="material-symbols-outlined text-[12px]">favorite_border</span>
                      <span>EMPTY WISHLIST</span>
                    </span>
                  )}

                  <div className="text-[12px] font-semibold text-[var(--admin-accent)] hover:underline flex items-center gap-1">
                    <span>Customer Journey Log</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Pagination Footer ─── */}
      {!dataLoading && customers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--admin-border)]">
          <span className="text-xs text-[var(--admin-text-secondary)]">
            Showing {filteredCustomers.length} of {customers.length} loaded records
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)]">
              <span>Per page:</span>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  setPagination((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                    page: 1,
                  }));
                }}
                className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded px-2 py-1 text-xs font-semibold text-[var(--admin-text-primary)] outline-none cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={pagination.page === 1}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs disabled:opacity-50 cursor-pointer rounded-[4px]"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-[var(--admin-text-secondary)] px-1">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(pagination.pages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs disabled:opacity-50 cursor-pointer rounded-[4px]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Customer Detail App Drawer & Popup ─── */}
      <AnimatePresence>
        {selectedCustomerId && (
          <AdminCustomerDetailDrawer
            customerId={selectedCustomerId}
            customerData={customers.find((c) => c._id === selectedCustomerId)}
            isOpen={!!selectedCustomerId}
            onClose={() => setSelectedCustomerId(null)}
            onDelete={handleDeleteCustomer}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default AdminCustomers;
