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
import { EXTERNAL_URLS } from '../../config/constants';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { RentalPaymentModal } from './AdminRentalDetail/RentalPaymentModal';

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
  const [paymentModalRental, setPaymentModalRental] = useState(null);

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

  const getCardColorClass = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
      case 'returned':
        return 'bg-green-50 border-green-200';
      case 'active_rental':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
      case 'confirmed':
      case 'return_requested':
        return 'bg-yellow-50 border-yellow-200';
      case 'late_return':
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
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

      totalVolume += r.rentalCharge || 0;
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

  const goToDetail = (rentalId) => {
    _navigate(`/admin/rentals/detail/${rentalId}`);
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
            className="admin-card p-0 bg-transparent sm:bg-white sm:shadow-sm sm:border sm:border-[var(--admin-border-subtle)]"
          >
            <div className="hidden md:block overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th>Rental ID</th>
                    <th>Customer</th>
                    <th className="hidden md:table-cell">Product</th>
                    <th className="hidden lg:table-cell">Period</th>
                    <th className="hidden sm:table-cell">Deposit</th>
                    <th>Total</th>
                    <th className="hidden sm:table-cell">Payment</th>
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
                          className="admin-table-row-clickable group bg-[var(--admin-surface)] hover:bg-[var(--admin-bg-subtle)] transition-colors border-b border-[var(--admin-border-subtle)]"
                          onClick={() => goToDetail(r._id)}
                        >
                          <td className="font-semibold text-[var(--admin-text-primary)]">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                #{r._id.substring(r._id.length - 8).toUpperCase()}
                                {isNew && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                                    title="Recent rental"
                                  />
                                )}
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded w-max bg-indigo-100 text-indigo-700">
                                RENTAL
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span
                                className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]"
                                title={
                                  r.userId?.name ||
                                  r.user?.name ||
                                  r.shippingAddress?.name ||
                                  'Guest'
                                }
                              >
                                {r.userId?.name ||
                                  r.user?.name ||
                                  r.shippingAddress?.name ||
                                  'Guest'}
                              </span>
                              <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">call</span>
                                {r.userId?.phone ||
                                  r.user?.phone ||
                                  r.shippingAddress?.phone ||
                                  'N/A'}
                              </span>
                              {r.shippingAddress?.address && (
                                <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1.5 flex items-start gap-1 leading-tight max-w-[150px]">
                                  <span className="material-symbols-outlined text-[11px] mt-0.5 shrink-0">
                                    location_on
                                  </span>
                                  <span className="truncate whitespace-normal line-clamp-2">
                                    {r.shippingAddress.address}
                                    {r.shippingAddress.city ? `, ${r.shippingAddress.city}` : ''}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden md:table-cell max-w-[250px] py-3 pr-4">
                            <div className="flex items-center gap-3 w-full">
                              <img
                                src={imgSrc}
                                alt={r.productTitle}
                                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm bg-gray-100 shrink-0"
                              />
                              <span
                                className="text-[12.5px] font-medium text-[var(--admin-text-secondary)] leading-snug line-clamp-2"
                                title={r.productTitle}
                              >
                                {r.productTitle}
                              </span>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell text-[var(--admin-text-secondary)] text-[12px]">
                            {new Date(r.rentalStartDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            -{' '}
                            {new Date(r.rentalEndDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td className="font-bold text-[var(--admin-success)] hidden sm:table-cell">
                            <div className="flex flex-col items-start">
                              <span>{formatCurrency(r.securityDeposit)}</span>
                              <span
                                className={`block text-[9px] uppercase mt-1 p-0.5 px-1 font-extrabold rounded ${r.depositStatus === 'refunded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                              >
                                {r.depositStatus || 'held'}
                              </span>
                            </div>
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(r.totalAmount)}
                          </td>
                          <td className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[9.5px] uppercase font-bold text-[var(--admin-text-tertiary)]">
                                {paymentMethod}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`admin-badge uppercase text-[9px] tracking-wider font-bold ${
                                    isPaid
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isPartiallyPaid || isPendingCod
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {paymentStatus}
                                </span>
                                {!isPaid && (
                                  <button
                                    onClick={() => setPaymentModalRental(r)}
                                    className="h-5 px-1.5 rounded bg-[#b8a48f]/15 hover:bg-[#b8a48f] text-[#8c745d] hover:text-white text-[9px] font-bold border border-[#b8a48f]/40 flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Record payment for this rental"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">
                                      payments
                                    </span>
                                    <span>Pay</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              value={r.status}
                              onChange={(e) => updateRentalStatus(r._id, e.target.value)}
                              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-1 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border-strong)] bg-white/80 backdrop-blur-sm text-[var(--admin-text-primary)] cursor-pointer outline-none shadow-sm"
                            >
                              {allStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {s.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {!isPaid && (
                                <button
                                  onClick={() => setPaymentModalRental(r)}
                                  className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[#8c745d] hover:text-white hover:bg-[#b8a48f] transition-colors"
                                  title="Record Manual Payment"
                                >
                                  <span className="material-symbols-outlined text-[17px]">
                                    payments
                                  </span>
                                </button>
                              )}

                              <button
                                onClick={() => goToDetail(r._id)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                                title="View Details"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  visibility
                                </span>
                              </button>

                              {/* WhatsApp Contact */}
                              <a
                                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[#25D366] transition-colors"
                                title="Contact via WhatsApp"
                              >
                                <WhatsAppIcon className="w-4 h-4" />
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

            <div className="flex md:hidden flex-col gap-3 px-1 py-3">
              {filteredRentals.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)]">
                  <EmptyState
                    icon="inventory_2"
                    title="No Rentals Found"
                    description="No rentals match the criteria."
                  />
                </div>
              ) : (
                filteredRentals.map((r) => {
                  const paymentStatus = (r.paymentStatus || 'paid')
                    .replace(/_/g, ' ')
                    .toUpperCase();
                  const isPaid = r.paymentStatus === 'paid' || r.paymentStatus === 'COD Collected';
                  const imgSrc =
                    r.productImage ||
                    r.productImages?.[0] ||
                    r.productThumbnail ||
                    'https://placehold.co/100x100/f3f4f6/a1a1aa?text=Image';

                  return (
                    <div
                      key={r._id}
                      onClick={() => goToDetail(r._id)}
                      className="bg-[var(--admin-surface)] rounded-xl p-4 border border-[var(--admin-border-subtle)] shadow-xs hover:border-[var(--admin-border)] hover:shadow-sm transition-all duration-200 cursor-pointer group text-left flex flex-col relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10 overflow-hidden rounded-tl-[12px]">
                        <div className="absolute top-2 -left-7 w-24 text-[7px] font-extrabold text-white text-center uppercase py-[2px] -rotate-45 shadow-sm tracking-wider bg-indigo-500">
                          RENTAL
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[15px] font-bold text-gray-900 ml-6">
                          #{r._id.substring(r._id.length - 8).toUpperCase()}
                        </span>
                        <div className="relative inline-block">
                          <select
                            value={r.status}
                            onChange={(e) => updateRentalStatus(r._id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="appearance-none bg-white border border-[#E0E2D9] text-gray-900 text-[10px] font-bold uppercase tracking-wider rounded-[6px] py-1.5 pl-3 pr-8 cursor-pointer shadow-sm outline-none"
                          >
                            {allStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-900">
                            <span className="material-symbols-outlined text-[16px]">
                              expand_more
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-2 text-gray-800">
                        <span className="text-[12px] font-medium uppercase tracking-wide truncate max-w-[140px]">
                          {r.userId?.name || r.user?.name || r.shippingAddress?.name || 'Guest'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[12px] font-medium">
                          <span className="material-symbols-outlined text-[15px]">call</span>
                          {(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || 'N/A')
                            .replace('+91', '')
                            .trim()}
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 mb-4 text-gray-800">
                        <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">
                          location_on
                        </span>
                        <span className="text-[11px] leading-snug line-clamp-2">
                          {r.shippingAddress?.address || 'Address not provided'}
                          {r.shippingAddress?.city ? `, ${r.shippingAddress.city}` : ''}
                        </span>
                      </div>

                      <div className="border-y border-black/5 py-3 mb-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={imgSrc}
                            alt=""
                            className="w-[34px] h-[34px] rounded-md object-cover border border-white shadow-sm bg-gray-100 shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] text-gray-800 leading-snug line-clamp-2 mt-0.5 font-bold">
                              {r.productTitle}
                            </span>
                            <span className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(r.rentalStartDate).toLocaleDateString()} -{' '}
                              {new Date(r.rentalEndDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-1">
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold text-gray-900">
                            {formatCurrency(r.totalAmount)}
                          </span>
                          <span className="text-[9px] font-bold text-green-700 uppercase">
                            Deposit: {formatCurrency(r.securityDeposit)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-[4px] border shadow-sm ${
                              paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : paymentStatus === 'PARTIALLY PAID'
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-red-100 text-red-700 border-red-200'
                            }`}
                          >
                            {paymentStatus}
                          </span>

                          {!isPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentModalRental(r);
                              }}
                              className="h-6 px-2 rounded bg-[#b8a48f] hover:bg-[#a5917c] text-white text-[10px] font-bold shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Record Manual Payment"
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                payments
                              </span>
                              <span>Pay</span>
                            </button>
                          )}

                          <button
                            className="text-gray-700 hover:text-[var(--admin-primary)] transition-colors ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToDetail(r._id);
                            }}
                            title="View Detail"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              visibility
                            </span>
                          </button>

                          <a
                            href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(r.userId?.phone || r.user?.phone || r.shippingAddress?.phone || '').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-700 hover:text-[#25D366] transition-colors"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon className="w-[18px] h-[18px]" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Payment Recording Modal directly from table */}
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
