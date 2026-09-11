import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import rentalService from '../../services/api/rentalService';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  AdminStatusPill,
  AdminStatusDropdown,
  formatCurrency,
  fadeUp,
  stagger,
  smoothScrollCardIntoView,
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { isWithinPeriod } from '../utils/dateFilters';
import { useAdminFilters } from '../components/filters/useAdminFilters';
import { rentalFilterConfig } from '../components/filters/configs/rentalFilterConfig';
import { AdminActiveFilterChips } from '../components/filters/AdminActiveFilterChips';
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { InvoiceTemplate } from '../../components/ui';
import { RentalPaymentModal } from './AdminRentalDetail/RentalPaymentModal';
import { AdminRentalDrawer } from '../components/AdminRentalDrawer';

const formatDateDMY = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const allStatuses = ['pending', 'confirmed', 'active_rental', 'returned', 'completed', 'cancelled'];

const RENTAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active_rental', label: 'Active Rental' },
  { value: 'returned', label: 'Returned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminRentalOrders({ hideHeader = false, initialFilter = 'All' }) {
  const _navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest first');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  const {
    filteredItems: filteredRentalsBeforeSort,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
  } = useAdminFilters(rentals, rentalFilterConfig, searchQuery);
  const [paymentModalRental, setPaymentModalRental] = useState(null);
  const [invoiceRental, setInvoiceRental] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [selectedRental, setSelectedRental] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openRentalDrawer = (rental) => {
    setSelectedRental(rental);
    setIsDrawerOpen(true);
  };

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      const isExpanding = !next.has(id);
      if (isExpanding) {
        next.add(id);
        smoothScrollCardIntoView(`rental-card-${id}`);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setDataLoading(true);
    try {
      const res = await rentalService.adminGetAll();
      if (res.success) {
        const payload = res.data ?? [];
        setRentals(Array.isArray(payload) ? payload : payload.data || []);
      } else {
        toast.error('Failed to load rental orders');
      }
    } catch (_err) {
      toast.error('Error loading rentals');
    } finally {
      setDataLoading(false);
    }
  };

  const updateRentalStatus = async (id, status) => {
    try {
      setUpdatingStatusId(id);
      const res = await rentalService.adminUpdateStatus(id, status);
      if (res.success) {
        toast.success(`Rental status updated to ${status.replace(/_/g, ' ')}`);
        await fetchRentals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleApproveRental = async (r) => {
    try {
      setUpdatingStatusId(r._id);
      const res = await rentalService.adminUpdateStatus(r._id, 'confirmed');
      if (res.success) {
        toast.success('Rental order confirmed!');
        await fetchRentals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm rental');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCancelRental = async (r) => {
    try {
      setUpdatingStatusId(r._id);
      const res = await rentalService.adminUpdateStatus(r._id, 'cancelled');
      if (res.success) {
        toast.success('Rental order cancelled');
        await fetchRentals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel rental');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { All: rentals.length };
    allStatuses.forEach((s) => (counts[s] = rentals.filter((r) => r.status === s).length));
    return counts;
  }, [rentals]);

  // Two-stage pipeline: Sorting separated from filtering
  const filteredRentals = useMemo(() => {
    let list = [...filteredRentalsBeforeSort];

    if (sortBy === 'Newest first') {
      list.sort(
        (a, b) =>
          new Date(b.createdAt || b.rentalStartDate) - new Date(a.createdAt || a.rentalStartDate),
      );
    } else if (sortBy === 'Oldest first') {
      list.sort(
        (a, b) =>
          new Date(a.createdAt || a.rentalStartDate) - new Date(b.createdAt || b.rentalStartDate),
      );
    } else if (sortBy === 'Rental date ↑') {
      list.sort((a, b) => new Date(a.rentalStartDate || 0) - new Date(b.rentalStartDate || 0));
    } else if (sortBy === 'Rental date ↓') {
      list.sort((a, b) => new Date(b.rentalStartDate || 0) - new Date(a.rentalStartDate || 0));
    } else if (sortBy === 'Value ↑') {
      list.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
    } else if (sortBy === 'Value ↓') {
      list.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    }

    return list;
  }, [filteredRentalsBeforeSort, sortBy]);

  const rentalStats = useMemo(() => {
    let totalVolume = 0;
    let depositsHeld = 0;
    let depositsRefunded = 0;
    let activeRentals = 0;

    rentals.forEach((r) => {
      if (!isWithinPeriod(r.createdAt || r.rentalStartDate, filterState.timing)) return;

      totalVolume += r.rentalCharge || r.totalAmount || 0;
      if (r.depositStatus === 'refunded') {
        depositsRefunded += r.securityDeposit || 0;
      } else if (r.status !== 'cancelled') {
        depositsHeld += r.securityDeposit || 0;
      }
      if (r.status === 'active_rental') {
        activeRentals++;
      }
    });

    return { totalVolume, depositsHeld, depositsRefunded, activeRentals };
  }, [rentals, filterState.timing]);

  const goToDetail = (rentalId) => {
    _navigate(`/admin/rentals/detail/${rentalId}`);
  };

  const getRentalOrderForInvoice = (r) => {
    if (!r) return null;
    return {
      ...r,
      _id: r._id,
      id: r._id,
      orderId: r.rentalOrderId || r._id,
      rentalOrderId: r.rentalOrderId || r._id,
      orderType: 'rental',
      isPureRental: true,
      rentalStartDate: r.rentalStartDate,
      rentalEndDate: r.rentalEndDate,
      durationDays: r.durationDays,
      securityDeposit: r.securityDeposit || 0,
      rentalCharge: r.rentalCharge || r.totalAmount || 0,
      totalAmount: r.totalAmount || 0,
      total: r.totalAmount || 0,
      paymentMethod: r.paymentMethod || 'Razorpay',
      paymentStatus: r.paymentStatus || 'paid',
      shippingAddress: r.shippingAddress || {
        name: r.userId?.name || r.user?.name || 'Customer',
        phone: r.userId?.phone || r.user?.phone || '',
        address: r.shippingAddress?.address || '',
        city: r.shippingAddress?.city || '',
        state: r.shippingAddress?.state || '',
        pincode: r.shippingAddress?.pincode || '',
      },
      items: (() => {
        const qty = Number(r.quantity || 1);
        const unitRentalPrice = Number(
          r.rentalRate?.rentalPrice ??
            r.rentalRate?.rate ??
            (qty > 0 && r.rentalCharge
              ? Math.round((r.rentalCharge / qty) * 100) / 100
              : r.rentalCharge || 0),
        );
        return Array.isArray(r.items) && r.items.length > 0
          ? r.items.map((it) => ({
              ...it,
              price: it.rentalPrice || it.price || unitRentalPrice,
              rentalPrice: it.rentalPrice || unitRentalPrice,
              isRental: true,
              type: 'rental',
            }))
          : [
              {
                title: r.productTitle || 'Rental Item',
                name: r.productTitle || 'Rental Item',
                image: r.productImage || r.productImages?.[0] || r.productThumbnail,
                quantity: qty,
                price: unitRentalPrice,
                rentalPrice: unitRentalPrice,
                deposit: r.securityDeposit || 0,
                isRental: true,
                type: 'rental',
                rentalStartDate: r.rentalStartDate,
                rentalEndDate: r.rentalEndDate,
                rentalDurationDays: r.durationDays,
              },
            ];
      })(),
    };
  };

  const downloadExcel = () => {
    const headers = [
      'Rental ID',
      'Customer',
      'Phone',
      'Product',
      'Start Date',
      'End Date',
      'Deposit',
      'Total',
      'Status',
    ];
    const rows = filteredRentals.map((r) => [
      r.rentalOrderId || r._id,
      `"${(r.userId?.name || r.user?.name || r.shippingAddress?.name || 'Guest').replace(/"/g, '""')}"`,
      r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '',
      `"${(r.productTitle || '').replace(/"/g, '""')}"`,
      formatDateDMY(r.rentalStartDate),
      formatDateDMY(r.rentalEndDate),
      r.securityDeposit,
      r.totalAmount,
      r.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rental_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="Rentals"
          subtitle={
            dataLoading ? (
              <span>Loading rentals summary...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {rentals.length} Total Rentals
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {statusCounts.pending} Pending
                </span>
                {statusCounts.active_rental > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    {statusCounts.active_rental} Active
                  </span>
                )}

                {(statusCounts.returned || 0) + (statusCounts.completed || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {(statusCounts.returned || 0) + (statusCounts.completed || 0)} Completed
                  </span>
                )}
              </div>
            )
          }
        />
      )}

      {/* Search & Actions Bar: Sticky below top navbar (Exact 42px standard) */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar - Height exactly matches FilterBar/Actions (42px) */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rentals by ID, customer, phone, item..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Action Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Rental Filters"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeCount > 0 ? `${activeCount} Filters` : 'Filters'}
                </span>
                {activeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </button>

              <AdminFilterDrawer
                isOpen={showFiltersMenu}
                onClose={() => setShowFiltersMenu(false)}
                title="Filter Rentals"
                icon="tune"
                activeCount={activeCount}
                onClearAll={() => {
                  resetAllFilters();
                  setSortBy('Newest first');
                  setSearchQuery('');
                }}
                clearAllLabel="Reset All"
                onApply={() => setShowFiltersMenu(false)}
              >
                {/* Status Filter */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Rental Status
                  </label>
                  <select
                    value={filterState.status}
                    onChange={(e) => setFilterValue('status', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Statuses ({rentals.length})</option>
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (
                        {statusCounts[s] || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Timing Filter */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Event Date Period
                  </label>
                  <select
                    value={filterState.timing}
                    onChange={(e) => setFilterValue('timing', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    {[
                      'All Time',
                      'Today',
                      'Tomorrow',
                      'This Weekend',
                      'Next 7 Days',
                      'This Month',
                      'This Year',
                    ].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deposit Status Filter */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Security Deposit
                  </label>
                  <select
                    value={filterState.depositStatus}
                    onChange={(e) => setFilterValue('depositStatus', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Deposits</option>
                    <option value="held">Deposit Held (Active)</option>
                    <option value="refunded">Deposit Refunded</option>
                    <option value="forfeited">Deposit Forfeited</option>
                  </select>
                </div>

                {/* Rental Charge Range */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Rental Value Range (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={filterState.amountRange?.min || ''}
                      onChange={(e) =>
                        setFilterValue('amountRange', {
                          ...filterState.amountRange,
                          min: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none text-[var(--admin-text-primary)]"
                    />
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={filterState.amountRange?.max || ''}
                      onChange={(e) =>
                        setFilterValue('amountRange', {
                          ...filterState.amountRange,
                          max: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none text-[var(--admin-text-primary)]"
                    />
                  </div>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="Newest first">Newest first</option>
                    <option value="Oldest first">Oldest first</option>
                    <option value="Rental date ↑">Rental date ↑</option>
                    <option value="Rental date ↓">Rental date ↓</option>
                    <option value="Value ↑">Total Value ↑</option>
                    <option value="Value ↓">Total Value ↓</option>
                  </select>
                </div>
              </AdminFilterDrawer>
            </div>

            {/* Export Button */}
            <button
              onClick={downloadExcel}
              className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Export CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </motion.div>

        {/* Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          totalCount={totalCount}
          matchCount={matchCount}
          onClearAll={() => {
            resetAllFilters();
            setSortBy('Newest first');
            setSearchQuery('');
          }}
          itemName="rentals"
          className="mt-2 mb-1"
        />
      </div>

      {/* Real-time Rental Financial & Operations Ledger */}
      <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
          <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              Total Rental Volume
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {formatCurrency(rentalStats.totalVolume)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Gross rental value
            </span>
          </div>

          <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
              Active Rentals
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {rentalStats.activeRentals}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Currently with customers
            </span>
          </div>

          <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
              Deposits Held
            </span>
            <p className="text-[14px] font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(rentalStats.depositsHeld)}
            </p>
            <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
              Awaiting return / inspection
            </span>
          </div>

          <div className="p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
            <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider">
              Deposits Refunded
            </span>
            <p className="text-[14px] font-bold text-[var(--admin-success)]">
              {formatCurrency(rentalStats.depositsRefunded)}
            </p>
            <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
              Successfully returned
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div key="loading" initial="hidden" animate="show" exit="hidden" variants={fadeUp}>
            <SkeletonTable rows={10} cols={8} />
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="w-full"
          >
            {/* Desktop Table View */}
            <div className="hidden md:block admin-card overflow-x-auto">
              <table className="admin-table admin-table-compact admin-orders-table w-full">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap w-[120px]">Rental ID</th>
                    <th className="whitespace-nowrap min-w-[130px]">Customer</th>
                    <th className="hidden md:table-cell whitespace-nowrap w-[180px]">
                      Item / Period
                    </th>
                    <th className="whitespace-nowrap w-[95px]">Total</th>
                    <th className="hidden sm:table-cell whitespace-nowrap w-[95px]">Deposit</th>
                    <th className="hidden sm:table-cell whitespace-nowrap w-[95px]">Payment</th>
                    <th className="whitespace-nowrap w-[140px]">Status</th>
                    <th className="hidden lg:table-cell whitespace-nowrap w-[105px]">Date</th>
                    <th className="text-right whitespace-nowrap w-[115px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRentals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <EmptyState
                          icon={searchQuery || activeCount > 0 ? 'search_off' : 'inventory_2'}
                          title={
                            searchQuery || activeCount > 0 ? 'No Matches Found' : 'No Rentals Found'
                          }
                          description={
                            searchQuery || activeCount > 0
                              ? 'No rental orders match the search or filter criteria.'
                              : 'You have not received any rental bookings yet.'
                          }
                          action={
                            searchQuery || activeCount > 0 ? (
                              <button
                                onClick={() => {
                                  resetAllFilters();
                                  setSearchQuery('');
                                  setSortBy('Newest first');
                                }}
                                className="admin-btn admin-btn-outline cursor-pointer"
                              >
                                Clear Filters
                              </button>
                            ) : (
                              <button
                                onClick={() => fetchRentals()}
                                className="admin-btn admin-btn-outline"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  refresh
                                </span>
                                Refresh Page
                              </button>
                            )
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRentals.map((r) => {
                      const paymentMethod = r.paymentMethod?.replace(/_/g, ' ') || 'Razorpay';
                      const paymentStatus = (r.paymentStatus || 'paid')
                        .replace(/_/g, ' ')
                        .toUpperCase();
                      const isPaid =
                        r.paymentStatus === 'paid' || r.paymentStatus === 'COD Collected';
                      const isPendingCod =
                        r.paymentStatus === 'Pending COD' ||
                        (r.paymentMethod === 'Cash_on_Delivery' && !isPaid);
                      const isPartiallyPaid = r.paymentStatus === 'partially_paid';
                      const isNew =
                        new Date().getTime() - new Date(r.createdAt).getTime() <
                        24 * 60 * 60 * 1000;

                      const imgSrc =
                        r.productImage ||
                        r.productImages?.[0] ||
                        r.productThumbnail ||
                        'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';

                      return (
                        <tr
                          key={r._id}
                          className="admin-table-row-clickable group transition-colors"
                          onClick={() => openRentalDrawer(r)}
                        >
                          {/* Order ID & Tag */}
                          <td>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                                #
                                {r.rentalOrderId || r._id.substring(r._id.length - 8).toUpperCase()}
                                {isNew && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                                    title="Recent rental"
                                  />
                                )}
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                                RENTAL
                              </span>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="min-w-[130px] max-w-[160px]">
                            <div className="flex flex-col">
                              <span
                                className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px] text-[13px]"
                                title={
                                  r.userId?.name ||
                                  r.user?.name ||
                                  r.shippingAddress?.name ||
                                  'Customer'
                                }
                              >
                                {r.userId?.name ||
                                  r.user?.name ||
                                  r.shippingAddress?.name ||
                                  'Customer'}
                              </span>
                              <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1.5 truncate">
                                <span className="w-3.5 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[13px]">
                                    call
                                  </span>
                                </span>
                                <span className="truncate">
                                  {r.userId?.phone ||
                                    r.user?.phone ||
                                    r.shippingAddress?.phone ||
                                    'N/A'}
                                </span>
                              </span>
                              {r.shippingAddress?.address && (
                                <span className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5 flex items-center gap-1.5 leading-tight max-w-[150px]">
                                  <span className="w-3.5 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[13px]">
                                      location_on
                                    </span>
                                  </span>
                                  <span className="truncate whitespace-normal line-clamp-1">
                                    {r.shippingAddress.city || r.shippingAddress.address}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Item / Period */}
                          <td className="hidden md:table-cell w-[180px] max-w-[200px] py-2.5">
                            <div className="flex items-center gap-2.5 w-full overflow-hidden">
                              <img
                                src={imgSrc}
                                alt=""
                                className="w-8 h-8 rounded-[4px] object-cover border border-stone-200 shrink-0 bg-white"
                                onError={(e) => {
                                  e.target.src =
                                    'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';
                                }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span
                                  className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate leading-snug"
                                  title={r.productTitle}
                                >
                                  {r.productTitle || 'Rental Item'}
                                </span>
                                <span className="text-[10px] text-[var(--admin-text-tertiary)] truncate mt-0.5">
                                  {formatDateDMY(r.rentalStartDate)} -{' '}
                                  {formatDateDMY(r.rentalEndDate)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="w-[95px] font-bold font-mono text-[var(--admin-text-primary)] whitespace-nowrap">
                            {formatCurrency(r.totalAmount)}
                          </td>

                          {/* Deposit */}
                          <td className="hidden sm:table-cell w-[95px] whitespace-nowrap">
                            <div className="flex flex-col items-start">
                              <span className="font-bold font-mono text-amber-700 dark:text-amber-400 text-[12px]">
                                {formatCurrency(r.securityDeposit)}
                              </span>
                              <span
                                className={`text-[8.5px] uppercase mt-0.5 px-1 py-0.2 rounded font-extrabold border ${
                                  r.depositStatus === 'refunded'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {r.depositStatus === 'refunded' ? 'Refunded' : 'Held'}
                              </span>
                            </div>
                          </td>

                          {/* Payment */}
                          <td className="hidden sm:table-cell w-[95px] whitespace-nowrap">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isPartiallyPaid || isPendingCod
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {paymentStatus}
                            </span>
                          </td>

                          {/* Status Dropdown */}
                          <td
                            className="w-[150px] whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AdminStatusDropdown
                              status={r.status}
                              options={RENTAL_STATUS_OPTIONS}
                              onChange={(newStatus) => updateRentalStatus(r._id, newStatus)}
                              loading={updatingStatusId === r._id}
                            />
                          </td>

                          {/* Date */}
                          <td className="hidden lg:table-cell text-[var(--admin-text-secondary)] text-[12px] whitespace-nowrap w-[105px]">
                            {formatDateDMY(r.createdAt || r.rentalStartDate)}
                          </td>

                          {/* Actions - Strictly Aligned in Straight Column */}
                          <td
                            className="text-right whitespace-nowrap w-[115px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1 w-[104px] ml-auto">
                              {/* Action 1: Quick Details */}
                              <button
                                type="button"
                                onClick={() => openRentalDrawer(r)}
                                className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                title="Quick Details"
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  visibility
                                </span>
                              </button>

                              {/* Action 2: View Invoice */}
                              <button
                                type="button"
                                onClick={() => setInvoiceRental(getRentalOrderForInvoice(r))}
                                className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                title="View Rental Tax Invoice"
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  receipt_long
                                </span>
                              </button>

                              {/* Action 3: WhatsApp Contact */}
                              <a
                                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[#25D366] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                title="WhatsApp Customer"
                              >
                                <WhatsAppIcon className="w-[16px] h-[16px]" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Exact Match with Orders Mobile Card Experience) */}
            <div className="flex md:hidden flex-col gap-3 px-0.5 py-1 pb-12">
              {filteredRentals.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
                  <EmptyState
                    icon={searchQuery || activeCount > 0 ? 'search_off' : 'inventory_2'}
                    title={searchQuery || activeCount > 0 ? 'No Matches Found' : 'No Rentals Found'}
                    description={
                      searchQuery || activeCount > 0
                        ? 'No rentals match your active search or filters.'
                        : 'You have not received any rental bookings yet.'
                    }
                    action={
                      searchQuery || activeCount > 0 ? (
                        <button
                          onClick={() => {
                            resetAllFilters();
                            setSearchQuery('');
                            setSortBy('Newest first');
                          }}
                          className="admin-btn admin-btn-outline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                filteredRentals.map((r) => {
                  const paymentMethod = r.paymentMethod?.replace(/_/g, ' ') || 'Razorpay';
                  const paymentStatus = (r.paymentStatus || 'paid')
                    .replace(/_/g, ' ')
                    .toUpperCase();
                  const isPaid = r.paymentStatus === 'paid' || r.paymentStatus === 'COD Collected';
                  const isNew =
                    new Date().getTime() - new Date(r.createdAt).getTime() < 24 * 60 * 60 * 1000;
                  const isExpanded = expandedCardIds.has(r._id);
                  const imgSrc =
                    r.productImage ||
                    r.productImages?.[0] ||
                    r.productThumbnail ||
                    'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';

                  return (
                    <div
                      key={r._id}
                      id={`rental-card-${r._id}`}
                      onClick={() => openRentalDrawer(r)}
                      className="relative overflow-hidden rounded-[4px] p-3.5 shadow-xs border border-stone-200/90 dark:border-stone-700/80 bg-white dark:bg-stone-900 flex flex-col gap-3 cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm transition-all"
                    >
                      {/* Header: Customer Name + Status Pill, with subtle faded Order ID & Rental Tag */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[var(--admin-text-primary)] text-[14px] truncate leading-tight">
                              {r.userId?.name ||
                                r.user?.name ||
                                r.shippingAddress?.name ||
                                'Customer'}
                            </span>
                            {isNew && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping shrink-0"
                                title="Recent rental"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)] dark:text-stone-400">
                              #{r.rentalOrderId || r._id.substring(r._id.length - 8).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border bg-indigo-50/80 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shrink-0">
                              RENTAL
                            </span>
                          </div>
                        </div>
                        <AdminStatusPill status={r.status} className="shrink-0" />
                      </div>

                      {/* Rental Product Item Box */}
                      <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-[4px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                        <img
                          src={imgSrc}
                          alt=""
                          className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 bg-white shrink-0 shadow-2xs"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                              RENTAL ITEM
                            </span>
                            {r.quantity > 1 && (
                              <span className="text-[9px] font-bold text-stone-500 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0">
                                x{r.quantity}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                            title={r.productTitle}
                          >
                            {r.productTitle || 'Rental Item'}
                          </p>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5">
                            {formatDateDMY(r.rentalStartDate)} - {formatDateDMY(r.rentalEndDate)}
                          </span>
                        </div>
                      </div>

                      {/* Financial Amount & Deposit Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                            Total:
                          </span>
                          <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px] whitespace-nowrap">
                            {formatCurrency(r.totalAmount)}
                          </span>

                          <span className="text-[10.5px] text-[var(--admin-text-secondary)] font-medium ml-1">
                            Deposit:
                          </span>
                          <span className="font-bold text-amber-700 dark:text-amber-400 text-[11px] whitespace-nowrap">
                            {formatCurrency(r.securityDeposit)}
                          </span>

                          <span
                            className={`inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] border whitespace-nowrap shrink-0 ${
                              r.depositStatus === 'refunded'
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                : 'text-amber-700 bg-amber-50 border-amber-200'
                            }`}
                          >
                            {r.depositStatus === 'refunded' ? 'Refunded' : 'Held'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <span
                            className={`inline-flex items-center gap-1 h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isPaid && (
                              <span className="material-symbols-outlined text-[12px]">
                                check_circle
                              </span>
                            )}
                            {paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Status Action Section:
                          - When pending: show APPROVE RENTAL & CANCEL buttons + Details toggle
                          - When confirmed/active: Symmetrical 2-column grid (36px height, 50% width each)
                      */}
                      {r.status === 'pending' ? (
                        <div
                          className="flex items-center justify-between pt-2 border-t border-stone-200/70 dark:border-stone-700/60 gap-2 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* APPROVE Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveRental(r);
                              }}
                              disabled={updatingStatusId === r._id}
                              className="flex-1 min-w-0 h-9 rounded-[4px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50"
                            >
                              {updatingStatusId === r._id ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                              ) : (
                                <span className="material-symbols-outlined text-[16px] shrink-0">
                                  check_circle
                                </span>
                              )}
                              <span className="truncate">Approve Rental</span>
                            </button>

                            {/* CANCEL Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRental(r);
                              }}
                              disabled={updatingStatusId === r._id}
                              className="h-9 px-3 rounded-[4px] border border-red-200 text-red-700 bg-white hover:bg-red-50 active:scale-95 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px] text-red-600">
                                cancel
                              </span>
                              <span>Cancel</span>
                            </button>
                          </div>

                          {/* Details Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandCard(r._id);
                            }}
                            className={`h-9 px-2.5 rounded-[4px] border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              isExpanded
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                            }`}
                            title="Toggle Order Details"
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            <span className="material-symbols-outlined text-[16px] shrink-0 text-stone-500">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-700/60 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 shrink-0">
                            Status:
                          </span>

                          {/* Symmetrical 2-Column Grid */}
                          <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                            {/* Box 1: Status Dropdown */}
                            <div className="relative w-full h-9">
                              <select
                                value={r.status || 'confirmed'}
                                onChange={(e) => updateRentalStatus(r._id, e.target.value)}
                                disabled={updatingStatusId === r._id}
                                style={{ backgroundImage: 'none' }}
                                className="admin-no-arrow w-full h-9 !min-h-[36px] !max-h-[36px] !appearance-none !bg-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[4px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors disabled:opacity-50 truncate"
                              >
                                {RENTAL_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                                {updatingStatusId === r._id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span className="material-symbols-outlined text-[16px]">
                                    expand_more
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Box 2: Details Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandCard(r._id);
                              }}
                              className={`w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[4px] border text-[11px] font-bold flex items-center justify-between px-2.5 transition-colors cursor-pointer shadow-2xs ${
                                isExpanded
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                  : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                              }`}
                              title="Toggle Order Details"
                            >
                              <span className="truncate">{isExpanded ? 'Hide' : 'Details'}</span>
                              <span className="material-symbols-outlined text-[16px] shrink-0 text-stone-500">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expandable Details Panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            key={`rental-card-expanded-${r._id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div
                              className="pt-2 border-t border-dashed border-stone-200 dark:border-stone-700 flex flex-col gap-2 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Customer Contact: Equally aligned 2-column grid */}
                              <div className="grid grid-cols-2 gap-2 items-center text-[11px] text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 px-2.5 py-2 rounded-[4px] border border-stone-200/60 dark:border-stone-700/60">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-400 shrink-0 select-none">
                                    call
                                  </span>
                                  <a
                                    href={`tel:${r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || ''}`}
                                    className="font-semibold text-stone-800 dark:text-stone-200 hover:underline truncate leading-tight inline-flex items-center"
                                  >
                                    {(
                                      r.userId?.phone ||
                                      r.user?.phone ||
                                      r.shippingAddress?.phone ||
                                      'No phone'
                                    )
                                      .replace('+91', '')
                                      .trim()}
                                  </a>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                                  <a
                                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate leading-tight inline-flex items-center"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              </div>

                              {/* Shipping / Delivery Address */}
                              {r.shippingAddress?.address && (
                                <div className="text-[11px] bg-stone-50 dark:bg-stone-800 p-2 rounded-[4px] border border-stone-200/70 dark:border-stone-700/70 flex items-start gap-1.5">
                                  <span className="material-symbols-outlined text-[14px] mt-0.5 text-stone-400 shrink-0">
                                    location_on
                                  </span>
                                  <div className="text-stone-700 dark:text-stone-300 leading-snug">
                                    <span className="font-bold text-stone-900 dark:text-stone-100">
                                      Delivery Address:
                                    </span>{' '}
                                    {r.shippingAddress.address}
                                    {r.shippingAddress.city ? `, ${r.shippingAddress.city}` : ''}
                                    {r.shippingAddress.pincode
                                      ? ` - ${r.shippingAddress.pincode}`
                                      : ''}
                                  </div>
                                </div>
                              )}

                              {/* Rental Period & Duration Box */}
                              <div className="flex items-center justify-between text-[11px] bg-amber-500/5 border border-amber-500/20 p-2 rounded-[4px] text-amber-900 dark:text-amber-300">
                                <div className="flex items-center gap-1.5 min-w-0 truncate">
                                  <span className="material-symbols-outlined text-[14px] text-amber-600 shrink-0">
                                    calendar_month
                                  </span>
                                  <span className="truncate">
                                    <span className="font-bold">Duration:</span>{' '}
                                    {r.durationDays ||
                                      Math.max(
                                        1,
                                        Math.ceil(
                                          (new Date(r.rentalEndDate) -
                                            new Date(r.rentalStartDate)) /
                                            (1000 * 60 * 60 * 24),
                                        ),
                                      )}{' '}
                                    Days
                                  </span>
                                </div>
                                <span className="font-bold text-[10px] uppercase bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                  {paymentMethod}
                                </span>
                              </div>

                              {/* Dates & Actions Strip (Redesigned matching Orders format) */}
                              <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-700/80 space-y-2.5">
                                {/* Date & Meta Row */}
                                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-0.5">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="material-symbols-outlined text-[14px] text-stone-400">
                                      schedule
                                    </span>
                                    Booked on{' '}
                                    <strong className="text-stone-800 dark:text-stone-200 font-semibold">
                                      {formatDateDMY(r.createdAt)}
                                    </strong>
                                  </span>
                                  <span className="font-mono text-[10.5px] text-stone-500 dark:text-stone-400">
                                    ID: #
                                    {r.rentalOrderId ||
                                      r._id.substring(r._id.length - 8).toUpperCase()}
                                  </span>
                                </div>

                                {/* Action Buttons Row */}
                                <div
                                  className={`grid ${!isPaid ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 sm:gap-2`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRentalDrawer(r);
                                    }}
                                    className="h-9 px-1.5 sm:px-2 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-[11px] sm:text-[11.5px] font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                    title="Quick Details"
                                  >
                                    <span className="material-symbols-outlined text-[15px] text-stone-500 dark:text-stone-400 shrink-0">
                                      visibility
                                    </span>
                                    <span className="truncate">Details</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInvoiceRental(getRentalOrderForInvoice(r));
                                    }}
                                    className="h-9 px-1.5 sm:px-2 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-[11px] sm:text-[11.5px] font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                    title="View & Download Invoice"
                                  >
                                    <span className="material-symbols-outlined text-[15px] text-stone-500 dark:text-stone-400 shrink-0">
                                      receipt_long
                                    </span>
                                    <span className="truncate">Invoice</span>
                                  </button>

                                  {!isPaid && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPaymentModalRental(r);
                                      }}
                                      className="h-9 px-1.5 sm:px-2 rounded-[4px] border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] sm:text-[11.5px] font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                      title="Record Payment"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-amber-600 dark:text-amber-400 shrink-0">
                                        payments
                                      </span>
                                      <span className="truncate">Pay</span>
                                    </button>
                                  )}

                                  <a
                                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-9 px-1.5 sm:px-2 rounded-[4px] border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 text-[11px] sm:text-[11.5px] font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                    title="Contact via WhatsApp"
                                  >
                                    <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                                    <span className="truncate">Chat</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direct Invoice Modal Integration */}
      <AnimatePresence>
        {invoiceRental && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceRental(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] no-print"
            />
            {/* Modal Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-[6px] mx-auto w-full max-w-[580px] max-h-[92vh] bg-[var(--admin-surface)] rounded-t-[6px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-outline-variant/30 z-[101] overflow-y-auto custom-scrollbar pt-2.5 pb-2 px-3 sm:pt-3 sm:pb-2.5 sm:px-4 print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white print:p-0 print:border-none"
            >
              <style type="text/css" media="print">
                {`
                  @page { size: A4 portrait; margin: 10mm; }
                  html, body { 
                    height: 100vh !important; 
                    overflow: hidden !important; 
                    margin: 0 !important; 
                    padding: 0 !important;
                  }
                  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
                  body * { visibility: hidden !important; }
                  .invoice-modal-container {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    transform: none !important;
                    overflow: hidden !important;
                    background: transparent !important;
                    box-shadow: none !important;
                  }
                  .print-invoice-area, .print-invoice-area * {
                    visibility: visible !important;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                  }
                  .print-invoice-area .font-mono {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                  }
                  .print-invoice-area {
                    position: static !important;
                    width: 540px !important;
                    max-width: 540px !important;
                    margin: 0 auto !important;
                    padding: 16px !important;
                    box-shadow: none !important;
                    border: 1px solid #e5e7eb !important;
                    background: white !important;
                    overflow: visible !important;
                  }
                  .no-print, .no-print * { display: none !important; }
                `}
              </style>
              <InvoiceTemplate
                order={invoiceRental}
                onClose={() => setInvoiceRental(null)}
                isAdmin={true}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-over Rental Details Drawer Panel */}
      <AnimatePresence>
        {isDrawerOpen && selectedRental && (
          <AdminRentalDrawer
            selectedRental={selectedRental}
            setIsDrawerOpen={setIsDrawerOpen}
            updateRentalStatus={updateRentalStatus}
            onViewInvoice={(r) => {
              setIsDrawerOpen(false);
              setInvoiceRental(getRentalOrderForInvoice(r));
            }}
            navigate={_navigate}
          />
        )}
      </AnimatePresence>

      {/* Manual Payment Recording Modal */}
      {paymentModalRental && (
        <RentalPaymentModal
          rental={paymentModalRental}
          onClose={() => setPaymentModalRental(null)}
          onSuccess={fetchRentals}
        />
      )}
    </motion.div>
  );
}
