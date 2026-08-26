import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import rentalService from '../../services/api/rentalService';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  formatCurrency,
  fadeUp,
  stagger,
  StatCard,
} from '../components/AdminUIKit';
import { isWithinPeriod } from '../utils/dateFilters';

const slideDrawer = {
  hidden: { x: '100%', opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

const allStatuses = [
  'pending',
  'active_rental',
  'late_return',
  'returned',
  'completed',
  'cancelled',
];

export function AdminRentalOrders({ hideHeader = false, initialFilter = 'All' }) {
  const _navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [dateFilter, setDateFilter] = useState('All Time');

  const [selectedRental, setSelectedRental] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      const res = await rentalService.adminUpdateStatus(id, status);
      if (res.success) {
        toast.success(`Rental status updated to ${status}`);
        fetchRentals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter((r) => {
      const matchStatus = filterStatus === 'All' || r.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        r._id?.toLowerCase()?.includes(q) ||
        (r.userId?.name || r.user?.name || '').toLowerCase().includes(q) ||
        r.productTitle?.toLowerCase()?.includes(q);
      return matchStatus && matchSearch;
    });
  }, [rentals, filterStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { All: rentals.length };
    allStatuses.forEach((s) => (counts[s] = rentals.filter((r) => r.status === s).length));
    return counts;
  }, [rentals]);

  const rentalStats = useMemo(() => {
    let totalVolume = 0;
    let depositsHeld = 0;
    let depositsRefunded = 0;
    let activeRentals = 0;

    rentals.forEach((r) => {
      if (!isWithinPeriod(r.createdAt || r.rentalStartDate, dateFilter)) return;

      totalVolume += r.totalAmount || 0;
      if (r.depositStatus === 'refunded') {
        depositsRefunded += r.securityDeposit || 0;
      } else if (r.status !== 'cancelled') {
        depositsHeld += r.securityDeposit || 0;
      }
      if (r.status === 'active_rental' || r.status === 'late_return') {
        activeRentals++;
      }
    });

    return { totalVolume, depositsHeld, depositsRefunded, activeRentals };
  }, [rentals, dateFilter]);

  const openRentalDrawer = (rental) => {
    setSelectedRental(rental);
    setIsDrawerOpen(true);
  };

  const downloadExcel = () => {
    const headers = [
      'Rental ID',
      'Customer',
      'Product',
      'Start Date',
      'End Date',
      'Deposit',
      'Total',
      'Status',
    ];
    const rows = filteredRentals.map((r) => [
      r._id,
      r.userId?.name || r.user?.name || 'Guest',
      `"${(r.productTitle || '').replace(/"/g, '""')}"`,
      new Date(r.rentalStartDate).toLocaleDateString(),
      new Date(r.rentalEndDate).toLocaleDateString(),
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
          title="Rental Orders"
          subtitle={`${rentals.length} active rentals`}
          icon="inventory_2"
          iconColor="info"
          mobileRow={true}
        >
          <button
            onClick={downloadExcel}
            className="admin-btn-icon text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
            title="Export to Excel"
          >
            <span className="material-symbols-outlined text-[24px]">download</span>
          </button>
        </PageHeader>
      )}

      {/* Real-time Rental Financial & Operations Ledger */}
      <motion.div variants={fadeUp} className="admin-grid-stats">
        <StatCard
          icon="account_balance_wallet"
          label="Total Rental Volume"
          value={formatCurrency(rentalStats.totalVolume)}
          change="Gross rental value"
          changeType="neutral"
          domainColor="revenue"
        />
        <StatCard
          icon="lock"
          label="Deposits Held"
          value={formatCurrency(rentalStats.depositsHeld)}
          change="Awaiting return/inspection"
          changeType="down"
          domainColor="danger"
        />
        <StatCard
          icon="local_shipping"
          label="Active Rentals"
          value={rentalStats.activeRentals}
          change="Currently with customers"
          changeType="neutral"
          domainColor="info"
        />
        <StatCard
          icon="check_circle"
          label="Deposits Refunded"
          value={formatCurrency(rentalStats.depositsRefunded)}
          change="Successfully returned"
          changeType="up"
          domainColor="success"
        />
      </motion.div>

      {/* Unified Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3 min-h-[48px]">
            <span className="material-symbols-outlined text-[20px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rentals..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full"
            />
          </div>

          <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Status Dropdown */}
            <div className="relative flex-1 sm:flex-none items-stretch">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-3 pr-8 appearance-none w-full sm:min-w-[150px] min-h-[48px]"
              >
                <option value="All">All Statuses</option>
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
              <span
                className="material-symbols-outlined absolute right-2 text-[18px] text-[var(--admin-text-tertiary)] pointer-events-none"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                expand_more
              </span>
            </div>

            {/* Time Filter Dropdown */}
            <div className="relative flex-1 sm:flex-none items-stretch">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-3 pr-8 appearance-none w-full sm:min-w-[130px] min-h-[48px]"
              >
                {['All Time', 'Today', 'Last 7 Days', 'This Month', 'This Year'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <span
                className="material-symbols-outlined absolute right-2 text-[18px] text-[var(--admin-text-tertiary)] pointer-events-none"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {hideHeader && (
          <div className="flex items-stretch gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={downloadExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 rounded font-bold uppercase tracking-wider text-[11px] border border-black/10 shadow-sm hover:bg-black/5 transition-all min-h-[48px]"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Excel
            </button>
          </div>
        )}
      </div>

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
            className="admin-card p-0"
          >
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th>Rental ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Rental Period</th>
                    <th>Deposit</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRentals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <EmptyState
                          icon="inventory_2"
                          title="No Rentals Found"
                          description="No rentals match the criteria."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRentals.map((r) => {
                      return (
                        <tr
                          key={r._id}
                          className="admin-table-row-clickable group"
                          onClick={() => openRentalDrawer(r)}
                        >
                          <td className="font-semibold text-[var(--admin-text-primary)]">
                            #{r._id.substring(r._id.length - 8).toUpperCase()}
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--admin-text-primary)]">
                                {r.userId?.name || r.user?.name || 'Guest'}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate text-[var(--admin-text-secondary)] font-medium">
                            {r.productTitle}
                          </td>
                          <td className="text-[11px] text-[var(--admin-text-secondary)]">
                            {new Date(r.rentalStartDate).toLocaleDateString()} -{' '}
                            {new Date(r.rentalEndDate).toLocaleDateString()}
                          </td>
                          <td className="font-bold text-[var(--admin-success)]">
                            {formatCurrency(r.securityDeposit)}
                            <span
                              className={`block text-[9px] uppercase mt-0.5 ${r.depositStatus === 'refunded' ? 'text-green-600' : 'text-amber-600'}`}
                            >
                              {r.depositStatus || 'held'}
                            </span>
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(r.totalAmount)}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                                r.status === 'active_rental'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : r.status === 'late_return'
                                    ? 'bg-red-100 text-red-700'
                                    : r.status === 'returned' || r.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {r.status?.replace('_', ' ') || 'unknown'}
                            </span>
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openRentalDrawer(r)}
                              className="admin-btn-icon text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                visibility
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDrawerOpen && selectedRental && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-[999] cursor-pointer"
              style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
            />

            <motion.aside
              initial="hidden"
              animate="show"
              exit="exit"
              variants={slideDrawer}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[450px] z-[1000] shadow-[var(--admin-shadow-2xl)] flex flex-col bg-[var(--admin-surface)] border-l border-[var(--admin-border)]"
            >
              <div className="px-6 py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 text-left bg-[var(--admin-bg-subtle)]">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    Rental Details
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                    #{selectedRental._id.toUpperCase()}
                  </p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="admin-btn-icon">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left custom-scrollbar">
                <div className="admin-card p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Product
                    </p>
                    <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] mt-1">
                      {selectedRental.productTitle}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[12px] pt-4 border-t border-[var(--admin-border-subtle)]">
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Start Date
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {new Date(selectedRental.rentalStartDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        End Date
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {new Date(selectedRental.rentalEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Total Cost
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {formatCurrency(selectedRental.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Deposit Held
                      </p>
                      <p className="font-semibold text-[var(--admin-success)]">
                        {formatCurrency(selectedRental.securityDeposit)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase text-[var(--admin-text-secondary)]">
                    Update Status
                  </p>
                  <select
                    value={selectedRental.status}
                    onChange={(e) => {
                      updateRentalStatus(selectedRental._id, e.target.value);
                      setSelectedRental({ ...selectedRental, status: e.target.value });
                    }}
                    className="admin-input w-full uppercase text-[11px] font-bold"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
