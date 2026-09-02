import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  StatusBadge,
  StatCard,
  SkeletonDashboard,
  EmptyState,
  formatCurrency,
  fadeUp,
} from '../../../components/AdminUIKit';
import { ManualPaymentModal } from '../../../components/ui/ManualPaymentModal';
import { bookingService } from '../../../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../../utils/core/errorHelpers';
import { useConfirm } from '../../../../context/ConfirmProvider';
export function BookingsTab({
  bookings,
  loadingBookings,
  totalContractVal,
  outstandingBal,
  activeBookingsCount,
  upcomingSetupsCount,
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);

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

  const getUrgencyCardClass = (date) => {
    if (!date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'opacity-60';
    return '';
  };

  const getCardColorClass = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
      case 'setup_in_progress':
      case 'execution':
        return 'bg-blue-50 border-blue-200';
      case 'pending_payment':
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'confirmed':
        return 'bg-purple-50 border-purple-200';
      case 'cancelled':
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyRowClass = (date) => {
    if (!date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return 'opacity-60 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)]';
    if (diffDays >= 0 && diffDays <= 7)
      return '!bg-[var(--admin-error)]/10 hover:!bg-[var(--admin-error)]/20';
    if (diffDays > 7 && diffDays <= 30)
      return '!bg-[var(--admin-warning)]/15 hover:!bg-[var(--admin-warning)]/25';
    return '';
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

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

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
      } else if (sortBy === 'upcoming') {
        return new Date(a.date) - new Date(b.date);
      }
      return 0;
    });

    return result;
  }, [bookings, searchQuery, urgencyFilter, paymentFilter, sortBy]);

  return (
    <motion.div key="bookings" initial="hidden" animate="show" variants={fadeUp}>
      {loadingBookings ? (
        <div className="admin-card overflow-hidden">
          <SkeletonDashboard />
        </div>
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
          <div className="admin-grid-stats mb-6">
            <StatCard
              icon="account_balance_wallet"
              label="Total Bookings Value"
              value={formatCurrency(totalContractVal)}
              change="Active Bookings"
              changeType="up"
              color="var(--admin-info)"
            />
            <StatCard
              icon="pending_actions"
              label="Pending Payments"
              value={formatCurrency(outstandingBal)}
              change="To Collect"
              changeType="up"
              color="var(--admin-warning)"
            />
            <StatCard
              icon="event_available"
              label="Setups Today"
              value={activeBookingsCount}
              change="Live Events"
              changeType="up"
              color="var(--admin-success)"
            />
            <StatCard
              icon="edit_calendar"
              label="Upcoming Setups"
              value={upcomingSetupsCount}
              change="Scheduled"
              changeType="up"
              color="var(--admin-accent)"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full mb-6">
            <div className="relative flex-1 min-w-0 sm:w-64 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                placeholder="Search by ID, customer, phone, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-10 min-w-0"
              />
            </div>
            <div className="grid grid-cols-3 sm:flex items-stretch gap-2 min-w-0 w-full pb-1 sm:pb-0">
              <div className="relative flex items-stretch">
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 w-full appearance-none truncate"
                >
                  <option value="all">All Urgencies</option>
                  <option value="critical">Critical (≤ 7 Days)</option>
                  <option value="high">High (8-30 Days)</option>
                  <option value="normal">Normal (&gt; 30 Days)</option>
                  <option value="past">Past Events</option>
                </select>
                <span
                  className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  expand_more
                </span>
              </div>
              <div className="relative flex items-stretch">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 w-full appearance-none truncate"
                >
                  <option value="all">All Payments</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
                <span
                  className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  expand_more
                </span>
              </div>
              <div className="relative flex items-stretch flex-1 lg:flex-none">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 w-full appearance-none truncate"
                >
                  <option value="newest">Newest Added</option>
                  <option value="upcoming">Upcoming Event</option>
                </select>
                <span
                  className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  expand_more
                </span>
              </div>
            </div>
          </div>

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
              {/* Mobile Card Layout */}
              <div className="grid grid-cols-1 gap-5 md:hidden">
                {filteredBookings.map((b) => (
                  <div
                    key={b._id || b.id}
                    onClick={() => navigate(`/admin/events/${b._id || b.id}`)}
                    className={`${getCardColorClass(b.status)} rounded-lg p-5 shadow-sm border flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-gray-500 transition-all duration-200 relative overflow-hidden ${getUrgencyCardClass(b.date)}`}
                  >
                    {/* Header: ID and Badges */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                          #{b.bookingId || b._id?.toString().substring(0, 8)}
                        </span>
                        <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] leading-tight mt-1 truncate max-w-[200px]">
                          {b.user?.name || 'Anonymous Client'}
                        </h3>
                        <span className="text-[12px] font-medium text-[var(--admin-text-secondary)]">
                          {b.contactPhone || b.user?.phone || 'No contact'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="relative group">
                          <select
                            className="appearance-none text-[10px] font-bold uppercase tracking-wider pl-3 pr-8 py-1.5 rounded-md outline-none cursor-pointer border border-[var(--admin-border)] bg-white text-[var(--admin-text-primary)] shadow-sm hover:border-[var(--admin-border-strong)] transition-all"
                            value={b.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newStatus = e.target.value;

                              if (newStatus !== 'pending_payment' && newStatus !== 'cancelled') {
                                if (
                                  !b.pricing?.paymentStatus ||
                                  b.pricing?.paymentStatus === 'unpaid'
                                ) {
                                  toast.error(
                                    'Status cannot be updated. Minimum payment must be recorded first.',
                                  );
                                  return;
                                }
                              }

                              const isConfirmed = await confirm({
                                title: 'Update Booking Status',
                                message: `Are you sure you want to change the status to ${newStatus.replace('_', ' ').toUpperCase()}?`,
                                confirmText: 'Yes, Update',
                                cancelText: 'Cancel',
                                type: 'warning',
                              });

                              if (!isConfirmed) return;

                              try {
                                const res = await bookingService.adminUpdateStatus(
                                  b._id || b.id,
                                  newStatus,
                                );
                                if (res.success) {
                                  toast.success('Status updated successfully!');
                                  window.location.reload();
                                }
                              } catch (err) {
                                toast.error(getErrorMessage(err, 'Failed to update status'));
                              }
                            }}
                          >
                            <option value="pending_payment">PENDING PAYMENT</option>
                            <option value="confirmed">CONFIRMED</option>
                            <option value="setup_in_progress">IN PROGRESS</option>
                            <option value="completed">COMPLETED</option>
                            <option value="cancelled">CANCELLED</option>
                          </select>
                          <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-[var(--admin-text-primary)]">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${b.pricing?.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                        >
                          {b.pricing?.paymentStatus || 'UNPAID'}
                        </span>
                      </div>
                    </div>

                    <hr className="border-[var(--admin-border)] w-full" />

                    {/* Event Package Snapshot */}
                    <div className="flex gap-4 items-center">
                      {b.eventPackage?.image || b.inspirationImages?.[0] ? (
                        <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 border border-[var(--admin-border-subtle)] shadow-sm">
                          <img
                            src={b.eventPackage?.image || b.inspirationImages?.[0]}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-[var(--admin-surface-hover)] flex items-center justify-center shrink-0 border border-[var(--admin-border-subtle)]">
                          <span className="text-gray-400 material-symbols-outlined">image</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider truncate block mb-0.5">
                          {b.eventType}
                        </span>
                        <span className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">
                          {b.title}
                        </span>
                        <span className="text-[13px] font-bold text-[var(--admin-accent)] mt-1">
                          {formatCurrency(b.pricing?.totalPrice)}
                        </span>
                      </div>
                    </div>

                    <hr className="border-[var(--admin-border)] w-full" />

                    {/* Logistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                            event
                          </span>
                          <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                            Date & Time
                          </span>
                        </div>
                        <span className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
                          {new Date(b.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {b.timing?.start && (
                          <span className="text-[11px] text-[var(--admin-text-secondary)]">
                            {b.timing.start} {b.timing.end ? `- ${b.timing.end}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                            location_on
                          </span>
                          <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                            Venue
                          </span>
                        </div>
                        <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] line-clamp-2 leading-tight">
                          {b.venue?.address || 'Not specified'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 w-full mt-2 pt-2">
                      {b.pricing?.paymentStatus !== 'paid' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPaymentBooking(b);
                          }}
                          className="flex-1 h-10 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">payments</span>
                          Record Pay
                        </button>
                      )}
                      {(() => {
                        const latestManualPayment = (b.payments || [])
                          .filter((p) => p.source === 'manual')
                          .sort((x, y) => new Date(y.date) - new Date(x.date))[0];
                        if (!latestManualPayment) return null;
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePayment(b, latestManualPayment.transactionId);
                            }}
                            title="Undo Recent Manual Payment"
                            className="h-10 w-10 rounded-md bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">undo</span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/events/${b._id || b.id}`);
                        }}
                        className={`flex-1 h-10 rounded-md font-bold text-[13px] flex items-center justify-center transition-colors ${
                          b.pricing?.paymentStatus === 'paid'
                            ? 'bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)]'
                            : 'border-2 border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]'
                        }`}
                      >
                        Manage Booking
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto admin-card overflow-hidden">
                <table className="admin-table w-full min-w-[800px]">
                  <thead>
                    <tr>
                      <th>Customer Details</th>
                      <th>Event Type</th>
                      <th>Date & Venue</th>
                      <th>Total Price</th>
                      <th>Booking Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr
                        key={b._id || b.id}
                        className={`admin-table-row-clickable ${getCardColorClass(b.status)} hover:bg-opacity-80 transition-colors ${getUrgencyRowClass(b.date)}`}
                        onClick={() => navigate(`/admin/events/${b._id || b.id}`)}
                      >
                        <td>
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                              #{b.bookingId || b._id?.toString().substring(0, 8)}
                            </span>
                            <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block truncate">
                              {b.user?.name || 'Anonymous Client'}
                            </span>
                            <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                              {b.contactPhone || b.user?.phone || 'No contact'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            {b.eventPackage?.image || b.inspirationImages?.[0] ? (
                              <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
                                <img
                                  src={b.eventPackage?.image || b.inspirationImages?.[0]}
                                  alt={b.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-[var(--admin-surface-hover)] flex items-center justify-center flex-shrink-0 border border-[var(--admin-border)]">
                                <span className="text-gray-400 material-symbols-outlined text-sm">
                                  image
                                </span>
                              </div>
                            )}
                            <div className="space-y-1">
                              <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">
                                {b.eventType}
                              </span>
                              <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate max-w-[150px]">
                                {b.title}
                              </h4>
                            </div>
                          </div>
                        </td>
                        <td>
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
                              {b.venue?.address}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-0.5 relative group">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                                {formatCurrency(b.pricing?.totalPrice)}
                              </span>
                              {b.pricing?.paymentStatus !== 'paid' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPaymentBooking(b);
                                  }}
                                  title="Record Manual Payment"
                                  className="admin-btn admin-btn-outline h-7 px-2 py-0 text-[10px] flex items-center justify-center gap-1 min-h-0 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[12px]">
                                    payments
                                  </span>
                                  Pay
                                </button>
                              )}
                              {(() => {
                                const latestManualPayment = (b.payments || [])
                                  .filter((p) => p.source === 'manual')
                                  .sort((x, y) => new Date(y.date) - new Date(x.date))[0];
                                if (!latestManualPayment) return null;
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePayment(b, latestManualPayment.transactionId);
                                    }}
                                    title="Undo Recent Manual Payment"
                                    className="admin-btn-icon w-7 h-7 min-h-0 bg-[var(--admin-error)]/10 text-[var(--admin-error)] hover:bg-[var(--admin-error)]/20 border border-[var(--admin-error)] shrink-0"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      undo
                                    </span>
                                  </button>
                                );
                              })()}
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                b.pricing?.paymentStatus === 'paid'
                                  ? 'text-[var(--admin-success)]'
                                  : b.pricing?.paymentStatus === 'partial'
                                    ? 'text-[var(--admin-warning)]'
                                    : 'text-[var(--admin-error)]'
                              }`}
                            >
                              {b.pricing?.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={b.status.replace('_', '')} />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/events/${b._id || b.id}`);
                              }}
                              className="admin-btn admin-btn-outline h-8 min-h-0 text-[10px] px-3 py-0 shrink-0"
                            >
                              Manage
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
            window.location.reload(); // Simple refresh to show updated data
          }}
        />
      )}
    </motion.div>
  );
}
