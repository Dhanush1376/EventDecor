import { m as motion, AnimatePresence } from 'framer-motion';
import { AdminCustomOrdersSkeleton, PageHeader, fadeUp, stagger } from '../components/AdminUIKit';
import { AdminCustomOrderConfig } from '../components/AdminCustomOrderConfig';
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customOrderService } from '../../services/domainServices';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';

import { InquiriesMetrics } from '../components/inquiries/InquiriesMetrics';
import { InquiriesTable } from '../components/inquiries/InquiriesTable';
import { InquiryDetailDrawer } from '../components/inquiries/InquiryDetailDrawer';

export function AdminInquiries({ hideHeader = false }) {
  const { searchQuery, setSearchQuery } = useAdmin();
  const queryClient = useQueryClient();

  // Workspace tabs: 'active' (Inquiries Pipeline), 'config' (Storefront Form Config)
  const [currentWorkspace, setCurrentWorkspace] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── PAGINATION & FILTERS ───
  const [page, setPage] = useState(1);
  const limit = 999999;
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest first');
  const [typeFilter, setTypeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, typeFilter, priorityFilter, sortBy]);

  // ─── DYNAMIC FORM OPTIONS ───
  const [cmsConfig, setCmsConfig] = useState(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── DATA FETCHING VIA REACT QUERY ───
  const {
    data: ordersData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['adminCustomOrders', page, limit, statusFilter, searchQuery],
    queryFn: () =>
      customOrderService.adminGetAll({
        page,
        limit,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: searchQuery,
        archived: 'false',
      }),
    keepPreviousData: true,
  });

  const rawOrders = useMemo(() => ordersData?.data?.items || ordersData?.items || [], [ordersData]);
  const totalPages = ordersData?.data?.totalPages || ordersData?.totalPages || 1;
  const totalItems = ordersData?.data?.total || ordersData?.total || 0;

  const { data: _configRes } = useQuery({
    queryKey: ['adminCustomOrderConfig'],
    queryFn: () => customOrderService.getConfig(),
    onSuccess: (res) => setCmsConfig(res?.success ? res.data : res),
  });

  const handleUpdatePriority = async (id, newPriority) => {
    try {
      const res = await customOrderService.adminUpdatePriority(id, newPriority);
      if (res.success) {
        toast.success(`Priority set to ${newPriority.toUpperCase()}`);
        refetch();
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change priority'));
    }
  };

  // ─── CLIENT-SIDE FILTER & SORT PIPELINE ───
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...rawOrders];

    // Filter by Type
    if (typeFilter !== 'All') {
      result = result.filter(
        (o) => (o.customOrderType || '').toLowerCase() === typeFilter.toLowerCase(),
      );
    }

    // Filter by Priority
    if (priorityFilter !== 'All') {
      result = result.filter(
        (o) => (o.priority || 'low').toLowerCase() === priorityFilter.toLowerCase(),
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'Newest first') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'Oldest first') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'Event date ↑') {
        return new Date(a.eventDate || 0) - new Date(b.eventDate || 0);
      }
      if (sortBy === 'Event date ↓') {
        return new Date(b.eventDate || 0) - new Date(a.eventDate || 0);
      }
      if (sortBy === 'Quote value ↑') {
        return (a.quotation?.total || 0) - (b.quotation?.total || 0);
      }
      if (sortBy === 'Quote value ↓') {
        return (b.quotation?.total || 0) - (a.quotation?.total || 0);
      }
      return 0;
    });

    return result;
  }, [rawOrders, typeFilter, priorityFilter, sortBy]);

  // Active filter count for badge
  const activeCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'All') count++;
    if (priorityFilter !== 'All') count++;
    if (sortBy !== 'Newest first') count++;
    return count;
  }, [typeFilter, priorityFilter, sortBy]);

  // ─── EXPORT TO CSV ───
  const handleExportCSV = () => {
    if (!filteredAndSortedOrders || filteredAndSortedOrders.length === 0) {
      toast.error('No custom orders to export');
      return;
    }

    const headers = [
      'Inquiry ID',
      'Customer Name',
      'Phone',
      'Email',
      'Type',
      'Occasion',
      'Event Date',
      'Priority',
      'Status',
      'Total Quote (INR)',
      'Created At',
    ];

    const rows = filteredAndSortedOrders.map((o) => [
      `"${o.customOrderNumber || o._id}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.customerPhone || o.phone || ''}"`,
      `"${o.customerEmail || ''}"`,
      `"${o.customOrderType || 'Custom'}"`,
      `"${(o.occasion || '').replace(/"/g, '""')}"`,
      `"${o.eventDate ? new Date(o.eventDate).toLocaleDateString('en-IN') : 'TBD'}"`,
      `"${(o.priority || 'low').toUpperCase()}"`,
      `"${o.status || 'Pending'}"`,
      o.quotation?.total || 0,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `custom_orders_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Custom orders exported to CSV');
  };

  // ─── ANALYTICS SUMMARIES ───
  const stats = useMemo(() => {
    const total = rawOrders.length;
    const pending = rawOrders.filter((o) => o.status === 'Pending').length;
    const quotesSent = rawOrders.filter((o) => o.status === 'Quote Sent').length;
    const approved = rawOrders.filter((o) => o.status === 'Approved').length;
    const valuation = rawOrders.reduce((sum, o) => sum + (o.quotation?.total || 0), 0);
    return { total, pending, quotesSent, approved, valuation };
  }, [rawOrders]);

  if (loading) {
    return <AdminCustomOrdersSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 max-w-[1440px] mx-auto w-full text-[var(--admin-text-primary)]"
    >
      {/* Executive Page Header with live status counts */}
      {!hideHeader && (
        <PageHeader
          title="Custom Orders"
          subtitle={
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {rawOrders.length} Total Inquiries
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {stats.pending} Pending
              </span>
              {stats.quotesSent > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {stats.quotesSent} Quotes Sent
                </span>
              )}
              {stats.approved > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {stats.approved} Approved
                </span>
              )}
            </div>
          }
        />
      )}

      {/* Sticky Search & Actions Bar: Exactly 42px Standard (Identical to Orders & Rentals) */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md">
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inquiries by ID, customer, occasion, details..."
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

          {/* Workspace Switcher: Inquiries vs Form Builder (Exact 42px standard) */}
          <div className="hidden sm:flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 h-[42px] min-h-[42px] max-h-[42px] box-border">
            <button
              type="button"
              onClick={() => setCurrentWorkspace('active')}
              className={`h-[30px] px-2.5 rounded-[3px] text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentWorkspace === 'active'
                  ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
              title="View customer custom order inquiries"
            >
              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
              <span>Inquiries</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentWorkspace('config')}
              className={`h-[30px] px-2.5 rounded-[3px] text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentWorkspace === 'config'
                  ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs'
                  : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
              }`}
              title="Customize storefront form steps and questions"
            >
              <span className="material-symbols-outlined text-[15px]">edit_note</span>
              <span>Form Builder</span>
            </button>
          </div>

          {/* Action Controls Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Dropdown Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Inquiry Filters"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeCount > 0 ? `${activeCount} Filters` : 'Filters'}
                </span>
                {activeCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showFiltersMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowFiltersMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute right-0 top-full mt-2 w-[300px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xl z-40 p-4 text-left"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border-subtle)]">
                        <span className="text-[12px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">filter_list</span>
                          Inquiry Filters
                        </span>
                        <button
                          onClick={() => {
                            setTypeFilter('All');
                            setPriorityFilter('All');
                            setSortBy('Newest first');
                          }}
                          className="text-[11px] text-[var(--admin-accent)] hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>

                      <div className="py-3 space-y-3.5">
                        {/* Sort By */}
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
                            <option value="Event date ↑">Event date ↑</option>
                            <option value="Event date ↓">Event date ↓</option>
                            <option value="Quote value ↑">Quote value ↑</option>
                            <option value="Quote value ↓">Quote value ↓</option>
                          </select>
                        </div>

                        {/* Inquiry Type */}
                        <div>
                          <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                            Inquiry Type
                          </label>
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="All">All Types</option>
                            <option value="product">Product Customization</option>
                            <option value="event">Event Setup</option>
                            <option value="custom">Bespoke Design</option>
                          </select>
                        </div>

                        {/* Priority */}
                        <div>
                          <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                            Priority Level
                          </label>
                          <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="All">All Priorities</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--admin-border-subtle)]">
                        <button
                          onClick={() => setShowFiltersMenu(false)}
                          className="w-full py-2 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-dark)] text-white text-[12px] font-bold rounded-[4px] transition-colors cursor-pointer"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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

        {/* Mobile Workspace Toggle */}
        <div className="sm:hidden flex items-center gap-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-0.5 mt-2 w-full">
          <button
            type="button"
            onClick={() => setCurrentWorkspace('active')}
            className={`flex-1 py-1 px-2 rounded-[3px] text-[11px] font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              currentWorkspace === 'active'
                ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs'
                : 'text-[var(--admin-text-secondary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
            <span>Inquiries</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentWorkspace('config')}
            className={`flex-1 py-1 px-2 rounded-[3px] text-[11px] font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              currentWorkspace === 'config'
                ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs'
                : 'text-[var(--admin-text-secondary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            <span>Form Builder</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ─── WORKSPACE: PIPELINE ─── */}
        {currentWorkspace === 'active' && (
          <div className="space-y-6">
            <InquiriesMetrics stats={stats} />

            <InquiriesTable
              orders={filteredAndSortedOrders}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              setSelectedOrder={setSelectedOrder}
              handleUpdatePriority={handleUpdatePriority}
              refetchOrders={refetch}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalItems={totalItems}
            />

            <InquiryDetailDrawer
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
              refetchOrders={refetch}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* ─── WORKSPACE: STOREFRONT FORM CONFIG ─── */}
        {currentWorkspace === 'config' && (
          <AdminCustomOrderConfig cmsConfig={cmsConfig} setCmsConfig={setCmsConfig} />
        )}
      </div>
    </motion.div>
  );
}
