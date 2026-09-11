import React, { useState, useEffect, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdmin } from '../context/AdminContext';
import {
  PageHeader,
  FilterBar,
  ChartTooltip,
  AdminPaymentsSkeleton,
  formatCurrency,
  fadeUp,
  stagger,
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { isWithinPeriod } from '../utils/dateFilters';

export function AdminPayments() {
  const navigate = useNavigate();
  const { orders = [], dataLoading, refreshOrders } = useAdmin();

  const [dateFilter, setDateFilter] = useState('All Time');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest first');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  // Auto-refresh orders every 60 seconds to keep payment stats live
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  // Aggregate metrics and chart details dynamically from actual MongoDB order collections
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let thisMonth = 0;
    let pending = 0;
    let refunded = 0;

    const monthlyMap = {};
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const currentMonthIndex = new Date().getMonth();
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIndex - i + 12) % 12;
      monthlyMap[monthNames[idx]] = 0;
    }

    const currentMonthName = monthNames[currentMonthIndex];

    orders.forEach((o) => {
      const amount = Number(o.total) || 0;
      const orderDate = o.date ? new Date(o.date) : new Date();
      const monthLabel = monthNames[orderDate.getMonth()];

      const withinFilter = isWithinPeriod(orderDate, dateFilter);

      const paymentStatusRaw = (o.rawOrder?.paymentStatus || o.payment || '').toLowerCase();
      const orderStatusRaw = (o.status || o.rawOrder?.orderStatus || '').toLowerCase();

      const isPaid =
        paymentStatusRaw === 'paid' ||
        paymentStatusRaw === 'cod collected' ||
        paymentStatusRaw === 'completed' ||
        paymentStatusRaw === 'settled' ||
        orderStatusRaw === 'delivered' ||
        o.payment === 'Paid' ||
        o.payment === 'COD Collected';

      const isRefunded =
        orderStatusRaw === 'cancelled' ||
        orderStatusRaw === 'refunded' ||
        o.rawOrder?.refundStatus === 'completed';

      if (isPaid) {
        if (withinFilter) totalCollected += amount;

        if (monthlyMap[monthLabel] !== undefined) {
          monthlyMap[monthLabel] += amount;
        } else {
          monthlyMap[monthLabel] = amount;
        }

        if (monthLabel === currentMonthName) {
          thisMonth += amount;
        }
      } else if (isRefunded) {
        if (withinFilter) refunded += amount;
      } else {
        if (withinFilter) pending += amount;
      }
    });

    const chartData = Object.keys(monthlyMap).map((m) => ({
      month: m,
      amount: monthlyMap[m],
    }));

    // Create cleanly structured, accurate transaction records
    const transactions = orders.map((o) => {
      const orderNum =
        o.rawOrder?.orderNumber || (o.id && o.id.length > 8 ? o.id.slice(-6).toUpperCase() : o.id);

      const razorpayId =
        o.rawOrder?.paymentInfo?.razorpayPaymentId ||
        o.rawOrder?.paymentDetails?.razorpay_payment_id ||
        o.rawOrder?.razorpayPaymentId;

      const paymentMethod =
        o.rawOrder?.paymentMethod?.toUpperCase() ||
        (o.payment && o.payment.includes('COD') ? 'COD' : 'UPI');

      const paymentStatusRaw = (o.rawOrder?.paymentStatus || o.payment || '').toLowerCase();
      const orderStatusRaw = (o.status || o.rawOrder?.orderStatus || '').toLowerCase();
      const refundStatus = (o.rawOrder?.refundStatus || '').toLowerCase();

      let statusLabel = 'Pending';

      if (
        refundStatus === 'completed' ||
        refundStatus === 'refunded' ||
        orderStatusRaw === 'cancelled' ||
        orderStatusRaw === 'refunded'
      ) {
        statusLabel = 'Refunded';
      } else if (
        paymentStatusRaw === 'paid' ||
        paymentStatusRaw === 'cod collected' ||
        paymentStatusRaw === 'completed' ||
        paymentStatusRaw === 'settled' ||
        orderStatusRaw === 'delivered' ||
        o.payment === 'Paid' ||
        o.payment === 'COD Collected'
      ) {
        statusLabel = 'Completed';
      } else {
        statusLabel = 'Pending';
      }

      return {
        id: o.id,
        order: orderNum,
        txnId: razorpayId ? `TXN-${razorpayId.slice(-8).toUpperCase()}` : null,
        isOnline: Boolean(razorpayId),
        customer: o.customer || o.shippingAddress?.name || 'Customer',
        amount: o.total || 0,
        method: paymentMethod,
        status: statusLabel,
        date: o.date || new Date().toISOString().split('T')[0],
        rawDate: o.date ? new Date(o.date) : new Date(),
      };
    });

    return {
      totalCollected,
      thisMonth,
      pending,
      refunded,
      chartData,
      transactions,
    };
  }, [orders, dateFilter]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = metrics.transactions.filter((t) => {
      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Completed' && t.status !== 'Completed') return false;
        if (statusFilter === 'Pending' && t.status !== 'Pending') return false;
        if (statusFilter === 'Refunded' && t.status !== 'Refunded') return false;
      }

      // Date Period
      if (!isWithinPeriod(t.rawDate, dateFilter)) return false;

      // Payment Method
      if (methodFilter !== 'All' && t.method.toLowerCase() !== methodFilter.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          t.order.toLowerCase().includes(q) ||
          (t.txnId && t.txnId.toLowerCase().includes(q)) ||
          t.customer.toLowerCase().includes(q) ||
          t.method.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'Newest first') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'Oldest first') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'Amount ↑') return Number(a.amount) - Number(b.amount);
      if (sortBy === 'Amount ↓') return Number(b.amount) - Number(a.amount);
      return 0;
    });

    return list;
  }, [metrics.transactions, statusFilter, dateFilter, methodFilter, searchQuery, sortBy]);

  // Counts for FilterBar
  const statusCounts = useMemo(() => {
    return {
      All: metrics.transactions.length,
      Completed: metrics.transactions.filter((t) => t.status === 'Completed').length,
      Pending: metrics.transactions.filter((t) => t.status === 'Pending').length,
      Refunded: metrics.transactions.filter((t) => t.status === 'Refunded').length,
    };
  }, [metrics.transactions]);

  // Active filters count for dropdown badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFilter !== 'All Time') count++;
    if (methodFilter !== 'All') count++;
    if (sortBy !== 'Newest first') count++;
    return count;
  }, [dateFilter, methodFilter, sortBy]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = [
      'Order Reference',
      'Transaction ID',
      'Customer',
      'Amount (INR)',
      'Payment Method',
      'Status',
      'Date',
    ];

    const rows = filteredTransactions.map((t) => [
      `"ORD-${t.order}"`,
      `"${t.txnId || 'N/A'}"`,
      `"${(t.customer || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${t.method}"`,
      `"${t.status}"`,
      `"${t.date}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported to CSV');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
      case 'Refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
            {status}
          </span>
        );
    }
  };

  if (dataLoading) {
    return <AdminPaymentsSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8 text-left"
    >
      {/* ─── PAGE HEADER WITH LIVE SUMMARY CHIPS ─── */}
      <PageHeader
        title="Payments"
        subtitle={
          dataLoading ? (
            <span>Loading payments...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {metrics.transactions.length} Total
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {formatCurrency(metrics.totalCollected)} Settled
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {formatCurrency(metrics.pending)} Pending
              </span>
              {metrics.refunded > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {formatCurrency(metrics.refunded)} Refunded
                </span>
              )}
            </div>
          )
        }
      />

      {/* ─── OPERATIONAL 4-CARD LEDGER STRIP (Clean & uncluttered) ─── */}
      <motion.div
        variants={fadeUp}
        className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--admin-surface)]">
          {/* Total Collected */}
          <div className="p-4 sm:p-5 space-y-1 border-r border-b lg:border-b-0 border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider block">
              Total Collected
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(metrics.totalCollected)}
            </p>
            <span className="text-[10.5px] sm:text-[11px] text-[var(--admin-text-secondary)] block truncate">
              All-time settled revenue
            </span>
          </div>

          {/* This Month */}
          <div className="p-4 sm:p-5 space-y-1 border-b lg:border-b-0 lg:border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              This Month
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(metrics.thisMonth)}
            </p>
            <span className="text-[10.5px] sm:text-[11px] text-[var(--admin-text-secondary)] block truncate">
              Current billing cycle
            </span>
          </div>

          {/* Pending Receivables */}
          <div className="p-4 sm:p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
            <span className="text-[10px] sm:text-[10.5px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Pending
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(metrics.pending)}
            </p>
            <span className="text-[10.5px] sm:text-[11px] text-[var(--admin-text-secondary)] block truncate">
              Unpaid & COD balance
            </span>
          </div>

          {/* Refunded / Cancelled */}
          <div className="p-4 sm:p-5 space-y-1 bg-[var(--admin-surface)]">
            <span className="text-[10px] sm:text-[10.5px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              Refunded
            </span>
            <p className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {formatCurrency(metrics.refunded)}
            </p>
            <span className="text-[10.5px] sm:text-[11px] text-[var(--admin-text-secondary)] block truncate">
              Cancelled & return volume
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── STICKY SEARCH, ACTIONS & STATUS BAR ─── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md space-y-2.5">
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
              placeholder="Search by order #, customer, method..."
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

          {/* Toggle Chart Button */}
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
              showChart
                ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border-[var(--admin-border-strong)] shadow-xs font-semibold'
                : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)]'
            }`}
            title={showChart ? 'Hide Revenue Chart' : 'Show Revenue Chart'}
          >
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            <span className="text-[13px] font-semibold hidden md:inline">Analytics</span>
          </button>

          {/* Action Controls Group: Filters & Export */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Dropdown Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeFilterCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Filter Transactions"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeFilterCount > 0 ? `${activeFilterCount} Filters` : 'Filters'}
                </span>
                {activeFilterCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <AdminFilterDrawer
                isOpen={showFiltersMenu}
                onClose={() => setShowFiltersMenu(false)}
                title="Filter Transactions"
                icon="tune"
                activeCount={activeFilterCount}
                onClearAll={() => {
                  setDateFilter('All Time');
                  setMethodFilter('All');
                  setSortBy('Newest first');
                }}
                clearAllLabel="Reset"
                onApply={() => setShowFiltersMenu(false)}
              >
                {/* Time Period */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Time Period
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All Time">All Time</option>
                    <option value="Today">Today</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="This Month">This Month</option>
                    <option value="This Year">This Year</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Payment Method
                  </label>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="COD">Cash On Delivery (COD)</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="NetBanking">Net Banking</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Sort Order
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="Newest first">Newest first</option>
                    <option value="Oldest first">Oldest first</option>
                    <option value="Amount ↑">Amount (Low to High)</option>
                    <option value="Amount ↓">Amount (High to Low)</option>
                  </select>
                </div>
              </AdminFilterDrawer>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-[42px] min-h-[42px] max-h-[42px] w-[42px] sm:w-auto px-0 sm:px-3.5 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Export CSV"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </motion.div>

        {/* ─── STATUS FILTER PILLS & RECORD COUNT (Unified 42px row) ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
          <FilterBar
            filters={['All', 'Completed', 'Pending', 'Refunded']}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />

          <span className="text-[12px] font-medium text-[var(--admin-text-tertiary)] shrink-0 hidden sm:block">
            Showing {filteredTransactions.length} of {metrics.transactions.length} records
          </span>
        </div>
      </div>

      {/* ─── MONTHLY REVENUE BAR CHART (Collapsible) ─── */}
      <AnimatePresence>
        {showChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="admin-card !rounded-[4px] p-4 sm:p-5 border border-[var(--admin-border)] shadow-xs text-left">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-[14px] text-[var(--admin-text-primary)]">
                    Monthly Collections (Sales Vol.)
                  </h3>
                  <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                    Gross settled payments over the past 6 months
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[var(--admin-accent)] uppercase tracking-wider bg-[var(--admin-accent-muted)] px-2 py-0.5 rounded-[3px]">
                  {dateFilter}
                </span>
              </div>

              <div className="h-[220px] w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--admin-border-subtle)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--admin-text-tertiary)', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${Math.round(v / 1000)}K`}`
                      }
                      dx={-10}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'var(--admin-surface-muted)' }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--admin-accent)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TRANSACTIONS LIST (Desktop Table + Dedicated Mobile Cards) ─── */}
      {filteredTransactions.length === 0 ? (
        <div className="admin-card !rounded-[4px] p-16 text-center flex flex-col items-center justify-center border border-[var(--admin-border)] shadow-xs">
          <span className="material-symbols-outlined text-[42px] text-[var(--admin-text-tertiary)] mb-2">
            search_off
          </span>
          <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            No matching transactions
          </p>
          <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1">
            Try adjusting your search terms or filter parameters.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (md and above) */}
          <motion.div
            variants={fadeUp}
            className="hidden md:block admin-card overflow-hidden p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
          >
            <div className="overflow-x-auto">
              <table className="admin-table w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Order Ref
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Payment Gateway ID
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Customer
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Method
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] text-right">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border-subtle)]">
                  {filteredTransactions.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer"
                      onClick={() => navigate('/admin/orders')}
                    >
                      {/* Order Reference */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[12.5px] text-[var(--admin-accent)] hover:underline flex items-center gap-1">
                          <span>#ORD-{p.order}</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </span>
                      </td>

                      {/* Gateway Transaction ID */}
                      <td className="py-3.5 px-4 font-mono text-[11.5px] text-[var(--admin-text-secondary)]">
                        {p.txnId ? (
                          <span className="font-semibold text-[var(--admin-text-primary)]">
                            {p.txnId}
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-tertiary)] italic">
                            Cash on Delivery
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-[12.5px] font-semibold text-[var(--admin-text-primary)]">
                        {p.customer}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-[13px] text-[var(--admin-text-primary)]">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                          {p.method}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-right text-[12px] text-[var(--admin-text-tertiary)] font-medium">
                        {new Date(p.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Mobile View Standalone Cards (Below md) */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredTransactions.map((p) => (
              <motion.div
                key={p.id}
                variants={fadeUp}
                onClick={() => navigate('/admin/orders')}
                className="bg-[var(--admin-surface)] rounded-[4px] p-3.5 border border-[var(--admin-border)] shadow-xs flex flex-col gap-2.5 cursor-pointer hover:border-[var(--admin-border-strong)] transition-all text-left"
              >
                {/* Header Row: Customer Name + Status Badge, with subtle Order ID */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-[var(--admin-accent)] font-bold text-[11px] flex items-center justify-center shrink-0">
                      {(p.customer || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[13.5px] text-[var(--admin-text-primary)] block truncate leading-tight">
                        {p.customer || 'Customer'}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)]">
                          #ORD-{p.order}
                        </span>
                        <span className="material-symbols-outlined text-[12px] text-[var(--admin-text-tertiary)]">
                          open_in_new
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {getStatusBadge(p.status)}
                    <span className="text-[10.5px] text-[var(--admin-text-tertiary)]">
                      {new Date(p.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Payment Details Box */}
                <div className="bg-[var(--admin-bg-subtle)] px-3 py-2 rounded-[4px] border border-[var(--admin-border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-[3px] text-[9.5px] font-bold uppercase tracking-wider bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border border-[var(--admin-border-subtle)] shrink-0">
                      {p.method}
                    </span>
                    {p.txnId ? (
                      <span className="font-mono text-[10.5px] text-[var(--admin-text-secondary)] truncate">
                        {p.txnId}
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-[var(--admin-text-tertiary)] italic">
                        COD Order
                      </span>
                    )}
                  </div>
                  <span className="text-[15px] font-bold text-[var(--admin-text-primary)] shrink-0">
                    {formatCurrency(p.amount)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default AdminPayments;
