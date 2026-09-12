import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import {
  AdminEventsBookingsTabSkeleton,
  EmptyState,
  AdminStatusPill,
  AdminStatusDropdown,
  AdminPaymentBadge,
  formatCurrency,
  fadeUp,
  smoothScrollCardIntoView,
  AdminFilterDrawer,
} from '../../../components/AdminUIKit';
import { ManualPaymentModal } from '../../../components/ui/ManualPaymentModal';
import { bookingService } from '../../../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../../utils/core/errorHelpers';
import { useConfirm } from '../../../../context/ConfirmProvider';
import { EXTERNAL_URLS } from '../../../../config/constants';
import { WhatsAppIcon } from '../../../../components/ui/WhatsAppIcon';

const ALL_BOOKING_STATUSES = [
  { value: 'pending_payment', label: 'PENDING PAYMENT' },
  { value: 'confirmed', label: 'CONFIRMED' },
  { value: 'setup_in_progress', label: 'IN PROGRESS' },
  { value: 'completed', label: 'COMPLETED' },
  { value: 'cancelled', label: 'CANCELLED' },
];

const getBookingCardStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') {
    return 'border border-emerald-500/40 bg-gradient-to-r from-emerald-500/[0.035] via-emerald-500/[0.01] to-white dark:to-[#26241f] hover:border-emerald-500/60 shadow-xs';
  }
  if (s === 'cancelled') {
    return 'border border-rose-500/40 bg-gradient-to-r from-rose-500/[0.035] via-rose-500/[0.01] to-white dark:to-[#26241f] hover:border-rose-500/60 shadow-xs';
  }
  if (s === 'confirmed' || s === 'setup_in_progress') {
    return 'border border-blue-500/40 bg-gradient-to-r from-blue-500/[0.035] via-blue-500/[0.01] to-white dark:to-[#26241f] hover:border-blue-500/60 shadow-xs';
  }
  return 'border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.045] via-amber-500/[0.015] to-white dark:to-[#26241f] hover:border-amber-500/60 shadow-xs';
};

export function BookingsTab({
  bookings = [],
  loadingBookings,
  totalContractVal,
  outstandingBal,
  activeBookingsCount,
  upcomingSetupsCount,
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [deletingBookingId, setDeletingBookingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('table');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (urgencyFilter !== 'all') count++;
    if (paymentFilter !== 'all') count++;
    if (bookingStatusFilter !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [urgencyFilter, paymentFilter, bookingStatusFilter, sortBy]);

  const handleExportCSV = () => {
    if (!filteredBookings.length) {
      toast.error('No bookings to export.');
      return;
    }
    const headers = [
      'Booking ID',
      'Customer Name',
      'Customer Phone',
      'Event Type',
      'Event Date',
      'Event Timing',
      'Venue Address',
      'Contract Total',
      'Advance Paid',
      'Pending Balance',
      'Payment Status',
      'Booking Status',
      'Created At',
    ];
    const rows = filteredBookings.map((b) => [
      `"${(b.bookingId || b._id || '').replace(/"/g, '""')}"`,
      `"${(b.user?.name || b.customerName || 'N/A').replace(/"/g, '""')}"`,
      `"${(b.contactPhone || b.user?.phone || 'N/A').replace(/"/g, '""')}"`,
      `"${(b.eventType || 'N/A').replace(/"/g, '""')}"`,
      `"${b.date ? new Date(b.date).toLocaleDateString('en-IN') : 'N/A'}"`,
      `"${b.timing?.start ? `${b.timing.start} - ${b.timing.end || ''}` : 'N/A'}"`,
      `"${(b.venue?.address || 'N/A').replace(/"/g, '""')}"`,
      b.pricing?.totalPrice || 0,
      b.pricing?.advancePayment || 0,
      b.pricing?.remainingBalance ?? b.pricing?.pendingBalance ?? 0,
      `"${b.pricing?.paymentStatus || 'unpaid'}"`,
      `"${b.status || 'pending'}"`,
      `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `event_bookings_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Bookings exported to CSV successfully!');
  };

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      const isExpanding = !next.has(id);
      if (isExpanding) {
        next.add(id);
        smoothScrollCardIntoView(`booking-card-${id}`);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleDeletePayment = async (booking, transactionId) => {
    const isConfirmed = await confirm({
      title: 'Undo Payment',
      message: 'Are you sure you want to undo this payment?',
      confirmText: 'Yes, Undo',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      const res = await bookingService.adminDeletePayment(booking._id || booking.id, transactionId);
      if (res.success) {
        toast.success('Payment successfully undone.');
        window.location.reload();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to undo payment.'));
    }
  };

  const handleStatusChange = async (booking, newStatus) => {
    const isConfirmed = await confirm({
      title: 'Update Booking Status',
      message: `Are you sure you want to change the status to ${newStatus.replace(/_/g, ' ').toUpperCase()}?`,
      confirmText: 'Yes, Update',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!isConfirmed) return;

    const bId = booking._id || booking.id;
    setUpdatingStatusId(bId);
    try {
      const res = await bookingService.adminUpdateStatus(bId, newStatus);
      if (res.success) {
        toast.success('Status updated successfully!');
        window.location.reload();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleApproveBooking = async (booking) => {
    await handleStatusChange(booking, 'confirmed');
  };

  const handleCancelBooking = async (booking) => {
    await handleStatusChange(booking, 'cancelled');
  };

  const handleDeleteBooking = async (booking, e) => {
    if (e) e.stopPropagation();
    const bId = booking._id || booking.id;
    const bookingLabel = booking.bookingId || `#${(bId || '').toString().slice(-6).toUpperCase()}`;

    const isConfirmed = await confirm({
      title: 'Move Booking to Recycle Bin?',
      message: `Are you sure you want to move booking ${bookingLabel} to the recycle bin? You can restore it later from the Recycle Bin.`,
      confirmText: 'Move to Recycle Bin',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!isConfirmed) return;

    setDeletingBookingId(bId);
    try {
      const res = await bookingService.adminSoftDelete(bId);
      if (res.success || res.data) {
        toast.success('Booking moved to recycle bin');
        window.location.reload();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to move booking to recycle bin'));
    } finally {
      setDeletingBookingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.bookingId?.toLowerCase().includes(q) ||
          b._id?.toLowerCase().includes(q) ||
          b.user?.name?.toLowerCase().includes(q) ||
          b.contactPhone?.toLowerCase().includes(q) ||
          b.title?.toLowerCase().includes(q) ||
          b.venue?.address?.toLowerCase().includes(q),
      );
    }

    if (urgencyFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      result = result.filter((b) => {
        if (!b.date) return false;
        const eventDate = new Date(b.date);
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (urgencyFilter === 'critical') return diffDays >= 0 && diffDays <= 7;
        if (urgencyFilter === 'high') return diffDays > 7 && diffDays <= 30;
        if (urgencyFilter === 'normal') return diffDays > 30;
        if (urgencyFilter === 'past') return diffDays < 0;
        return true;
      });
    }

    if (paymentFilter !== 'all') {
      result = result.filter((b) => b.pricing?.paymentStatus === paymentFilter);
    }

    if (bookingStatusFilter !== 'all') {
      result = result.filter((b) => b.status === bookingStatusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
      } else if (sortBy === 'upcoming') {
        return new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'highest_val') {
        return (b.pricing?.totalPrice || 0) - (a.pricing?.totalPrice || 0);
      } else if (sortBy === 'lowest_val') {
        return (a.pricing?.totalPrice || 0) - (b.pricing?.totalPrice || 0);
      }
      return 0;
    });

    return result;
  }, [bookings, searchQuery, urgencyFilter, paymentFilter, bookingStatusFilter, sortBy]);

  return (
    <motion.div key="bookings" initial="hidden" animate="show" variants={fadeUp}>
      {loadingBookings ? (
        <AdminEventsBookingsTabSkeleton />
      ) : bookings.length === 0 ? (
        <div className="admin-card overflow-hidden py-16 flex justify-center bg-[var(--admin-surface)]">
          <EmptyState
            icon="event_busy"
            title="No Bookings Yet"
            description="Active event setups and consultations will appear here."
          />
        </div>
      ) : (
        <>
          {/* Search & Actions Bar: Sticky below top navbar */}
          <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-6">
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
                  placeholder="Search bookings by ID, customer, phone, or title..."
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
                      showFiltersMenu || activeFiltersCount > 0
                        ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                        : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                    }`}
                    title="Booking Filters"
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

                  <AdminFilterDrawer
                    isOpen={showFiltersMenu}
                    onClose={() => setShowFiltersMenu(false)}
                    title="Booking Filters"
                    icon="filter_list"
                    activeCount={activeFiltersCount}
                    onClearAll={() => {
                      setUrgencyFilter('all');
                      setPaymentFilter('all');
                      setBookingStatusFilter('all');
                      setSortBy('newest');
                    }}
                    clearAllLabel="Clear All"
                    onApply={() => setShowFiltersMenu(false)}
                  >
                    {/* Urgency */}
                    <div>
                      <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                        Event Urgency / Timeline
                      </label>
                      <select
                        value={urgencyFilter}
                        onChange={(e) => setUrgencyFilter(e.target.value)}
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)]"
                      >
                        <option value="all">All Urgencies</option>
                        <option value="critical">Critical (≤ 7 Days)</option>
                        <option value="high">High (8-30 Days)</option>
                        <option value="normal">Normal (&gt; 30 Days)</option>
                        <option value="past">Past Events</option>
                      </select>
                    </div>

                    {/* Payment Filter */}
                    <div>
                      <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                        Payment Status
                      </label>
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)]"
                      >
                        <option value="all">All Payments</option>
                        <option value="paid">Paid in Full</option>
                        <option value="partial">Partially Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>

                    {/* Booking Status Filter */}
                    <div>
                      <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                        Booking Status
                      </label>
                      <select
                        value={bookingStatusFilter}
                        onChange={(e) => setBookingStatusFilter(e.target.value)}
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="team_assigned">Team Assigned</option>
                        <option value="setup_in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)]"
                      >
                        <option value="newest">Newest Added</option>
                        <option value="upcoming">Upcoming Event Date</option>
                        <option value="highest_val">Contract Value: High to Low</option>
                        <option value="lowest_val">Contract Value: Low to High</option>
                      </select>
                    </div>
                  </AdminFilterDrawer>
                </div>

                {/* View Mode Toggle (Table / Cards) */}
                <div className="flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 h-[42px] min-h-[42px] max-h-[42px] box-border">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                    title="Table View"
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">
                      view_list
                    </span>
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                    title="Cards View"
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">
                      grid_view
                    </span>
                  </button>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
                  title="Export CSV"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Real-time Event Bookings & Payment Reconciliation Ledger */}
          <motion.div
            variants={fadeUp}
            className="admin-card overflow-hidden text-left relative p-0 mb-6"
          >
            <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
            <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
              <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                  Total Bookings Value
                </span>
                <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] font-mono">
                  {formatCurrency(totalContractVal)}
                </p>
                <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                  Active bookings & volume
                </span>
              </div>
              <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
                  Pending Payments
                </span>
                <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] font-mono">
                  {formatCurrency(outstandingBal)}
                </p>
                <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                  To collect from clients
                </span>
              </div>
              <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Setups Today
                </span>
                <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] font-mono">
                  {activeBookingsCount}
                </p>
                <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                  Live on-site events
                </span>
              </div>
              <div className="p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
                <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--admin-success)]" />
                  Upcoming Setups
                </span>
                <p className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-success)] font-mono">
                  {upcomingSetupsCount}
                </p>
                <span className="text-[10px] text-[var(--admin-success)] opacity-80 mt-1 block">
                  Confirmed & scheduled
                </span>
              </div>
            </div>
          </motion.div>

          {filteredBookings.length === 0 ? (
            <div className="admin-card overflow-hidden py-16 flex justify-center bg-[var(--admin-surface)]">
              <EmptyState
                icon="search_off"
                title="No results found"
                description="Try adjusting your filters or search query."
              />
            </div>
          ) : (
            <>
              {/* Card Layout (Responsive grid when viewMode is cards, mobile-only when viewMode is table) */}
              <div
                className={
                  viewMode === 'cards'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5'
                    : 'grid grid-cols-1 gap-3 md:hidden'
                }
              >
                {filteredBookings.map((b) => {
                  const bId = b._id || b.id;
                  const isExpanded = expandedCardIds.has(bId);
                  const isPaid = b.pricing?.paymentStatus === 'paid';
                  const isPartial = b.pricing?.paymentStatus === 'partial';
                  const paymentStatus = b.pricing?.paymentStatus || 'unpaid';
                  const paymentMethod =
                    b.pricing?.paymentMethod ||
                    (b.payments?.[0]?.source === 'manual' ? 'manual' : 'online');
                  const paymentBorderClass = isPaid
                    ? 'border-l-[3px] border-l-emerald-500'
                    : paymentStatus === 'partial'
                      ? 'border-l-[3px] border-l-amber-500'
                      : b.status === 'refunded' || paymentStatus === 'refunded'
                        ? 'border-l-[3px] border-l-purple-500'
                        : 'border-l-[3px] border-l-rose-500';
                  const bookingCode =
                    b.bookingId || `#${(bId || '').toString().substring(0, 8).toUpperCase()}`;

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const eventDate = b.date ? new Date(b.date) : null;
                  const diffDays = eventDate
                    ? Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
                    : null;
                  const isCritical = diffDays !== null && diffDays >= 0 && diffDays <= 7;
                  const isNew =
                    b.createdAt &&
                    Date.now() - new Date(b.createdAt).getTime() < 24 * 60 * 60 * 1000;

                  const thumbnail = b.eventPackage?.image || b.inspirationImages?.[0] || null;
                  const latestManualPayment = (b.payments || [])
                    .filter((p) => p.source === 'manual')
                    .sort((x, y) => new Date(y.date) - new Date(x.date))[0];

                  return (
                    <div
                      key={bId}
                      id={`booking-card-${bId}`}
                      onClick={() => navigate(`/admin/events/${bId}`)}
                      className={`relative overflow-hidden rounded-[8px] p-3.5 flex flex-col gap-3 cursor-pointer transition-all ${paymentBorderClass} ${getBookingCardStyle(
                        b.status,
                      )}`}
                    >
                      {/* Header: Customer + Status Pill, with subtle faded Booking Code */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[var(--admin-text-primary)] text-[14px] truncate leading-tight">
                              {b.user?.name || 'Anonymous Client'}
                            </span>
                            {isCritical && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase shrink-0">
                                ≤{diffDays}d
                              </span>
                            )}
                            {isNew && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping shrink-0"
                                title="Recent booking"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)] dark:text-stone-400">
                              #{bookingCode}
                            </span>
                            {b.eventType && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 shrink-0">
                                {b.eventType}
                              </span>
                            )}
                          </div>
                        </div>
                        <AdminStatusPill status={b.status} className="shrink-0" />
                      </div>

                      {/* 3. Event Package Snapshot Box */}
                      <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[6px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={b.title}
                            className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 bg-white shrink-0 shadow-2xs"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-[4px] border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs text-amber-700">
                            <span className="material-symbols-outlined text-[20px]">
                              celebration
                            </span>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                              EVENT PACKAGE
                            </span>
                            {b.eventType && (
                              <span className="text-[9px] font-bold text-stone-600 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0 uppercase">
                                {b.eventType}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                            title={b.title}
                          >
                            {b.title || 'Event Decor Setup'}
                          </p>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              calendar_today
                            </span>
                            {b.date
                              ? new Date(b.date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Date TBD'}
                            {b.timing?.start ? ` • ${b.timing.start}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* 4. Financial Total & Payment Status Strip */}
                      <div className="flex items-center justify-between pt-0.5 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                            Total:
                          </span>
                          <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px]">
                            {formatCurrency(b.pricing?.totalPrice)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <AdminPaymentBadge
                            isPaid={isPaid}
                            method={paymentMethod}
                            status={paymentStatus}
                            orderStatus={b.status}
                          />

                          {!isPaid && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPaymentBooking(b);
                              }}
                              className="h-[22px] min-h-[22px] max-h-[22px] px-2 rounded-[4px] bg-amber-600 hover:bg-amber-700 text-white border border-amber-600 hover:border-amber-700 text-[9.5px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95 leading-none box-border select-none"
                              title="Record Manual Payment"
                            >
                              <span className="material-symbols-outlined !text-[12px] !leading-none shrink-0">
                                payments
                              </span>
                              <span>Record</span>
                            </button>
                          )}

                          {latestManualPayment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePayment(b, latestManualPayment.transactionId);
                              }}
                              title="Undo Recent Manual Payment"
                              className="h-[22px] min-h-[22px] max-h-[22px] px-2 rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 inline-flex items-center justify-center gap-1 text-[9.5px] font-bold uppercase tracking-wider transition-colors cursor-pointer leading-none box-border select-none shrink-0"
                              style={{
                                height: '22px',
                                minHeight: '22px',
                                maxHeight: '22px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span className="material-symbols-outlined !text-[11px] !leading-none shrink-0">
                                undo
                              </span>
                              <span>Undo</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 5. Status Action Controls:
                          - When pending_payment: show APPROVE & CANCEL buttons + Details toggle
                          - When other statuses: Symmetrical 2-column grid (36px height, 50% width each)
                      */}
                      {b.status === 'pending_payment' ? (
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
                                handleApproveBooking(b);
                              }}
                              disabled={updatingStatusId === bId}
                              className="flex-1 min-w-0 h-9 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50"
                            >
                              {updatingStatusId === bId ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                              ) : (
                                <span className="material-symbols-outlined text-[15px] shrink-0">
                                  check
                                </span>
                              )}
                              <span>Confirm</span>
                            </button>

                            {/* CANCEL Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelBooking(b);
                              }}
                              disabled={updatingStatusId === bId}
                              className="h-9 px-2.5 rounded-[6px] border border-red-200 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              <span>Cancel</span>
                            </button>
                          </div>

                          {/* DETAILS Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandCard(bId);
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
                          {/* Box 1: Status Dropdown (Equal 36px Height, 6px Radius) */}
                          <div className="relative w-full">
                            <select
                              value={b.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(b, e.target.value);
                              }}
                              disabled={updatingStatusId === bId}
                              className="w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[6px] pl-3 pr-8 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-200 cursor-pointer appearance-none shadow-2xs hover:border-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                            >
                              {ALL_BOOKING_STATUSES.map((st) => (
                                <option key={st.value} value={st.value}>
                                  {st.label}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-stone-400 pointer-events-none">
                              {updatingStatusId === bId ? (
                                <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin inline-block" />
                              ) : (
                                'expand_more'
                              )}
                            </span>
                          </div>

                          {/* Box 2: Details Toggle Button (Equal 36px Height, 6px Radius) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandCard(bId);
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
                            key={`booking-card-expanded-${bId}`}
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
                                  href={`tel:${b.contactPhone || b.user?.phone || ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!b.contactPhone && !b.user?.phone) {
                                      e.preventDefault();
                                      toast.error('No phone number available');
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[6px] border border-stone-200 dark:border-stone-700 bg-[#FAF9F5] dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-semibold hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-500 shrink-0">
                                    call
                                  </span>
                                  <span className="truncate">
                                    {b.contactPhone || b.user?.phone || 'No phone'}
                                  </span>
                                </a>

                                <a
                                  href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(b.contactPhone || b.user?.phone || '').replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!b.contactPhone && !b.user?.phone) {
                                      e.preventDefault();
                                      toast.error('No phone number available');
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-[6px] border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 transition-colors"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>

                              {/* Venue & Timing Logistics Box */}
                              <div className="bg-[#FAF9F5] dark:bg-stone-800/50 p-2.5 rounded-[6px] border border-stone-200/70 dark:border-stone-700/60 space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                                  <span className="flex items-center gap-1 font-medium">
                                    <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                      calendar_month
                                    </span>
                                    Date:
                                  </span>
                                  <span className="font-bold text-stone-800 dark:text-stone-100">
                                    {b.date
                                      ? new Date(b.date).toLocaleDateString('en-IN', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })
                                      : 'TBD'}
                                  </span>
                                </div>

                                {b.timing?.start && (
                                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                                    <span className="flex items-center gap-1 font-medium">
                                      <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                        schedule
                                      </span>
                                      Timing:
                                    </span>
                                    <span className="font-bold text-stone-800 dark:text-stone-100">
                                      {b.timing.start} {b.timing.end ? `- ${b.timing.end}` : ''}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-start justify-between text-stone-600 dark:text-stone-300 gap-2">
                                  <span className="flex items-center gap-1 font-medium shrink-0">
                                    <span className="material-symbols-outlined !text-[14px] text-stone-400">
                                      location_on
                                    </span>
                                    Venue:
                                  </span>
                                  <span className="font-bold text-stone-800 dark:text-stone-100 text-right truncate max-w-[200px]">
                                    {b.venue?.address || 'Not specified'}
                                  </span>
                                </div>
                              </div>

                              {/* Pricing & Balances */}
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-stone-50 dark:bg-stone-800/40 p-2 rounded-[6px] border border-stone-200/60 dark:border-stone-700/60">
                                  <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                                    Advance Paid
                                  </span>
                                  <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(b.pricing?.advancePayment || 0)}
                                  </span>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-800/40 p-2 rounded-[6px] border border-stone-200/60 dark:border-stone-700/60">
                                  <span className="text-[9.5px] uppercase font-bold text-stone-400 block">
                                    Balance Remaining
                                  </span>
                                  <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(b.pricing?.remainingBalance || 0)}
                                  </span>
                                </div>
                              </div>

                              {/* Footer Actions */}
                              <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500">
                                <span>
                                  Created:{' '}
                                  {b.createdAt
                                    ? new Date(b.createdAt).toLocaleDateString('en-IN')
                                    : 'Recently'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {['completed', 'cancelled', 'rejected'].includes(
                                    (b.status || '').toLowerCase(),
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteBooking(b, e)}
                                      disabled={deletingBookingId === bId}
                                      className="h-7 px-2 rounded-[5px] border border-red-200 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                      title="Move to Recycle Bin"
                                    >
                                      {deletingBookingId === bId ? (
                                        <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <span className="material-symbols-outlined text-[14px]">
                                          delete_outline
                                        </span>
                                      )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/events/${bId}`);
                                    }}
                                    className="h-7 px-3 rounded-[5px] bg-[var(--admin-accent)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">
                                      visibility
                                    </span>
                                    Manage
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div
                className={
                  viewMode === 'table'
                    ? 'hidden md:block overflow-x-auto admin-card overflow-hidden'
                    : 'hidden'
                }
              >
                <table className="admin-table w-full min-w-[950px]">
                  <thead>
                    <tr>
                      <th className="p-4 pl-6 min-w-[200px]">Customer Details</th>
                      <th className="p-4 min-w-[150px] w-[170px]">Event Type</th>
                      <th className="p-4 min-w-[160px] w-[180px]">Date & Venue</th>
                      <th className="p-4 min-w-[190px] w-[210px]">Total Price</th>
                      <th className="p-4 min-w-[160px] w-[170px]">Booking Status</th>
                      <th className="p-4 text-right pr-6 w-[120px] min-w-[120px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const bId = b._id || b.id;
                      const isPaid = b.pricing?.paymentStatus === 'paid';
                      const paymentStatus = b.pricing?.paymentStatus || 'unpaid';
                      const paymentMethod =
                        b.pricing?.paymentMethod ||
                        (b.payments?.[0]?.source === 'manual' ? 'manual' : 'online');
                      const paymentBorderClass = isPaid
                        ? 'border-l-[3px] border-l-emerald-500'
                        : paymentStatus === 'partial'
                          ? 'border-l-[3px] border-l-amber-500'
                          : b.status === 'refunded' || paymentStatus === 'refunded'
                            ? 'border-l-[3px] border-l-purple-500'
                            : 'border-l-[3px] border-l-rose-500';

                      const latestManualPayment = (b.payments || [])
                        .filter((p) => p.source === 'manual')
                        .sort((x, y) => new Date(y.date) - new Date(x.date))[0];

                      return (
                        <tr
                          key={bId}
                          className={`border-b border-[var(--admin-border-subtle)] hover:bg-stone-50/60 dark:hover:bg-stone-800/40 cursor-pointer transition-colors duration-200 ${paymentBorderClass}`}
                          onClick={() => navigate(`/admin/events/${bId}`)}
                        >
                          <td className="p-4 pl-6">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono font-bold text-[var(--admin-accent)] uppercase tracking-wider block mb-0.5">
                                #
                                {b.bookingId ||
                                  (bId || '').toString().substring(0, 8).toUpperCase()}
                              </span>
                              <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block truncate">
                                {b.user?.name || 'Anonymous Client'}
                              </span>
                              <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                                {b.contactPhone || b.user?.phone || 'No contact'}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {b.eventPackage?.image || b.inspirationImages?.[0] ? (
                                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
                                  <img
                                    src={b.eventPackage?.image || b.inspirationImages?.[0]}
                                    alt={b.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-[var(--admin-surface-hover)] flex items-center justify-center shrink-0 border border-[var(--admin-border)]">
                                  <span className="text-gray-400 material-symbols-outlined text-sm">
                                    celebration
                                  </span>
                                </div>
                              )}
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 rounded-[5px] text-[9.5px] font-bold uppercase tracking-wider border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800">
                                  {b.eventType || 'Event'}
                                </span>
                                <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate max-w-[150px]">
                                  {b.title}
                                </h4>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                                {new Date(b.date).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              {b.timing?.start && (
                                <span className="text-[10px] text-[var(--admin-text-secondary)] font-medium block mt-0.5 mb-0.5">
                                  {b.timing.start} {b.timing.end ? `- ${b.timing.end}` : ''}
                                </span>
                              )}
                              <span className="text-[11px] text-[var(--admin-text-tertiary)] truncate max-w-[180px] block">
                                {b.venue?.address || 'Venue TBD'}
                              </span>
                            </div>
                          </td>

                          <td
                            className="p-4 min-w-[190px] w-[210px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight">
                                  {formatCurrency(b.pricing?.totalPrice)}
                                </span>
                                <div className="mt-1.5">
                                  <AdminPaymentBadge
                                    isPaid={isPaid}
                                    method={paymentMethod}
                                    status={paymentStatus}
                                    orderStatus={b.status}
                                  />
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center">
                                {b.pricing?.paymentStatus !== 'paid' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPaymentBooking(b);
                                    }}
                                    title="Record Manual Payment"
                                    className="h-[26px] px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-[4px] bg-amber-600 hover:bg-amber-700 text-white border border-amber-600 hover:border-amber-700 inline-flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95 leading-none box-border select-none"
                                  >
                                    <span className="material-symbols-outlined !text-[13px] !leading-none shrink-0 text-white">
                                      payments
                                    </span>
                                    <span>Record</span>
                                  </button>
                                )}
                                {latestManualPayment && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePayment(b, latestManualPayment.transactionId);
                                    }}
                                    title="Undo Recent Manual Payment"
                                    className="h-[26px] px-2.5 rounded-[6px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 inline-flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer leading-none box-border select-none shrink-0"
                                  >
                                    <span className="material-symbols-outlined !text-[12px] !leading-none shrink-0">
                                      undo
                                    </span>
                                    <span>Undo</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          <td
                            className="p-4 min-w-[160px] w-[170px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AdminStatusDropdown
                              status={b.status}
                              options={ALL_BOOKING_STATUSES}
                              onChange={(newStatus) => handleStatusChange(b, newStatus)}
                              loading={updatingStatusId === bId}
                            />
                          </td>

                          <td
                            className="p-4 text-right pr-6 min-w-[120px] w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Action 1: Manage / View Booking */}
                              <button
                                onClick={() => navigate(`/admin/events/${bId}`)}
                                className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                title="Manage Booking"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  visibility
                                </span>
                              </button>

                              {/* Action 2: WhatsApp Customer */}
                              <a
                                href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${(b.contactPhone || b.user?.phone || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-success)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                title="WhatsApp"
                                onClick={(e) => {
                                  if (!b.contactPhone && !b.user?.phone) {
                                    e.preventDefault();
                                    toast.error('No phone number available for this booking.');
                                  }
                                }}
                              >
                                <WhatsAppIcon className="w-[15px] h-[15px]" />
                              </a>

                              {/* Action 3: Move to Recycle Bin (Terminal Status only) + Alignment spacer */}
                              {['completed', 'cancelled', 'rejected'].includes(
                                (b.status || '').toLowerCase(),
                              ) ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteBooking(b, e)}
                                  disabled={deletingBookingId === bId}
                                  className="admin-btn-icon w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] p-0 !rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                                  title="Move to Recycle Bin"
                                >
                                  {deletingBookingId === bId ? (
                                    <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <span className="material-symbols-outlined text-[17px]">
                                      delete_outline
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <div
                                  className="w-8 h-8 min-w-[32px] max-w-[32px] min-h-[32px] max-h-[32px] shrink-0 pointer-events-none"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {selectedPaymentBooking && (
        <ManualPaymentModal
          booking={selectedPaymentBooking}
          onClose={() => setSelectedPaymentBooking(null)}
          onSuccess={() => {
            setSelectedPaymentBooking(null);
            window.location.reload();
          }}
        />
      )}
    </motion.div>
  );
}
