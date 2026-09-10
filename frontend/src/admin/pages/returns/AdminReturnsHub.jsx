import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useConfirm } from '../../../context/ConfirmProvider';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  AdminStatusPill,
  fadeUp,
  stagger,
  formatCurrency,
} from '../../components/AdminUIKit';
import { isWithinPeriod } from '../../utils/dateFilters';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { EXTERNAL_URLS } from '../../../config/constants';

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

const RETURN_STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'return_courier_assigned', label: 'Courier Assigned' },
  { value: 'return_picked_up', label: 'Item Picked Up' },
  { value: 'return_in_transit', label: 'In Transit' },
  { value: 'return_received', label: 'Item Received' },
  { value: 'inspection_completed', label: 'QC Passed' },
  { value: 'refund_initiated', label: 'Refund Initiated' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const RETURN_STATUS_CONFIG = {
  submitted: {
    label: 'Submitted',
    color: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300',
    ribbon: 'bg-stone-600',
  },
  approved: {
    label: 'Approved',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    ribbon: 'bg-amber-600',
  },
  return_courier_assigned: {
    label: 'Courier Assigned',
    color:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
    ribbon: 'bg-indigo-600',
  },
  return_picked_up: {
    label: 'Picked Up',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    ribbon: 'bg-blue-600',
  },
  return_in_transit: {
    label: 'In Transit',
    color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400',
    ribbon: 'bg-sky-600',
  },
  return_received: {
    label: 'Received',
    color:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    ribbon: 'bg-purple-600',
  },
  inspection_started: {
    label: 'QC Started',
    color:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    ribbon: 'bg-purple-600',
  },
  inspection_completed: {
    label: 'QC Passed',
    color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400',
    ribbon: 'bg-teal-600',
  },
  refund_initiated: {
    label: 'Refund Initiated',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    ribbon: 'bg-emerald-600',
  },
  refund_completed: {
    label: 'Refund Done',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    ribbon: 'bg-emerald-600',
  },
  completed: {
    label: 'Completed',
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    ribbon: 'bg-emerald-600',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
    ribbon: 'bg-rose-600',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400',
    ribbon: 'bg-stone-600',
  },
};

const getRequestDetailUrl = (req) => {
  return req?.returnType === 'exchange'
    ? `/admin/exchanges/requests/${req._id}`
    : `/admin/returns/requests/${req._id}`;
};

const getReturnItemTitle = (item) => {
  if (!item) return 'Returned Item';
  return (
    item.title ||
    item.name ||
    item.productId?.title ||
    item.productId?.name ||
    item.product?.title ||
    item.product?.name ||
    'Returned Item'
  );
};

const getReturnItemImage = (item) => {
  if (!item) return null;
  const raw =
    item.imageSrc ||
    item.image ||
    item.productId?.imageSrc ||
    item.productId?.images?.[0]?.url ||
    (typeof item.productId?.images?.[0] === 'string' ? item.productId?.images?.[0] : null) ||
    item.productId?.image ||
    item.product?.imageSrc ||
    item.product?.images?.[0]?.url ||
    (typeof item.product?.images?.[0] === 'string' ? item.product?.images?.[0] : null) ||
    item.product?.image ||
    item.evidenceImages?.[0] ||
    item.evidencePhotos?.[0] ||
    null;

  if (
    raw &&
    (raw === '/placeholder-item.png' || raw.includes('photo-1513519245088-0e12902e5a38'))
  ) {
    return null;
  }
  return raw;
};

export default function AdminReturnsHub({ hideHeader = false }) {
  const navigate = useNavigate();
  const {
    returnsList = [],
    dashboardStats,
    fetchReturnsList,
    fetchDashboardStats,
    loading,
    performBulkAction,
    transitionStatus,
    settleRefund,
  } = useReturnManagement();

  const [savedView, setSavedView] = useState('All Returns');
  const [sortBy, setSortBy] = useState('Newest first');
  const [searchTerm, setSearchTerm] = useState('');
  const [returnTypeFilter, setReturnTypeFilter] = useState('All'); // 'All' | 'return' | 'exchange'
  const [statusDropdownFilter, setStatusDropdownFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [refundValueRange, setRefundValueRange] = useState({ min: '', max: '' });
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Ensure document body overflow is never stuck/locked
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Quick Side Drawer State
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'

  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState([]);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

  const toggleExpandCard = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const filterParams = {};
      if (searchTerm) filterParams.search = searchTerm;
      if (returnTypeFilter !== 'All') filterParams.type = returnTypeFilter;
      fetchReturnsList(filterParams);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchReturnsList, searchTerm, returnTypeFilter]);

  const stats = dashboardStats?.stats || {};

  const handleSavedViewChange = (e) => {
    const view = e.target.value;
    setSavedView(view);

    // Reset status overrides when changing saved view
    if (view === 'All Returns') {
      setStatusDropdownFilter('All');
    } else if (view === 'Needs Attention') {
      setStatusDropdownFilter('submitted');
    } else if (view === 'Completed & Settled') {
      setStatusDropdownFilter('completed');
    } else {
      setStatusDropdownFilter('All');
    }
  };

  const handleResetAllFilters = () => {
    setSavedView('All Returns');
    setSortBy('Newest first');
    setReturnTypeFilter('All');
    setStatusDropdownFilter('All');
    setDateFilter('All Time');
    setCustomDateRange({ from: '', to: '' });
    setRefundValueRange({ min: '', max: '' });
  };

  // Comprehensive dynamic filtering and sorting
  const filteredReturns = useMemo(() => {
    let result = [...returnsList];

    // 1. Client Search query filter (instant fallback)
    if (searchTerm && searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((r) => {
        const returnId = (r.returnId || r._id || '').toLowerCase();
        const orderRef = (
          typeof r.orderId === 'object'
            ? r.orderId?._id || r.orderId?.orderId || ''
            : r.orderId || ''
        ).toLowerCase();
        const customerName = (
          r.userId?.name ||
          r.user?.name ||
          r.customer?.name ||
          r.customerName ||
          ''
        ).toLowerCase();
        const customerPhone = (
          r.pickup?.address?.phone ||
          r.userId?.phone ||
          r.user?.phone ||
          r.customer?.phone ||
          ''
        ).toLowerCase();
        const customerEmail = (
          r.userId?.email ||
          r.user?.email ||
          r.customer?.email ||
          ''
        ).toLowerCase();
        const itemsMatch = r.items?.some((item) =>
          (item.title || item.name || item.product?.title || '').toLowerCase().includes(q),
        );
        const trackingMatch = (r.pickup?.trackingId || '').toLowerCase().includes(q);

        return (
          returnId.includes(q) ||
          orderRef.includes(q) ||
          customerName.includes(q) ||
          customerPhone.includes(q) ||
          customerEmail.includes(q) ||
          itemsMatch ||
          trackingMatch
        );
      });
    }

    // 2. Saved View Filter
    if (savedView === 'Needs Attention') {
      result = result.filter((r) => r.status === 'submitted');
    } else if (savedView === 'Pending Pickup') {
      result = result.filter((r) =>
        ['approved', 'return_courier_assigned', 'return_picked_up'].includes(r.status),
      );
    } else if (savedView === 'Pending Inspection') {
      result = result.filter((r) => ['return_received', 'inspection_started'].includes(r.status));
    } else if (savedView === 'Refund Ready') {
      result = result.filter((r) =>
        ['inspection_completed', 'refund_initiated'].includes(r.status),
      );
    } else if (savedView === 'Completed & Settled') {
      result = result.filter((r) => ['completed', 'refund_completed'].includes(r.status));
    } else if (savedView === 'High Fraud Risk') {
      result = result.filter((r) => Number(r.fraudScore || 0) >= 50 || Boolean(r.isHighFraudRisk));
    }

    // 3. Request Type Filter
    if (returnTypeFilter !== 'All') {
      result = result.filter((r) => {
        if (returnTypeFilter === 'exchange') {
          return r.returnType === 'exchange' || Boolean(r.exchangeId) || Boolean(r.exchangeDetails);
        }
        return r.returnType === 'return' || (!r.exchangeId && !r.exchangeDetails);
      });
    }

    // 4. Lifecycle Status Filter
    if (statusDropdownFilter !== 'All') {
      result = result.filter((r) => r.status === statusDropdownFilter);
    }

    // 5. Date Filter
    if (dateFilter !== 'All Time') {
      result = result.filter((r) => isWithinPeriod(r.createdAt, dateFilter, customDateRange));
    }

    // 6. Refund Value Range Filter
    if (refundValueRange.min !== '') {
      const minVal = Number(refundValueRange.min);
      result = result.filter((r) => {
        const amt = Number(
          r.refundBreakdown?.grandTotal ?? r.totalRefundAmount ?? r.refundAmount ?? 0,
        );
        return amt >= minVal;
      });
    }
    if (refundValueRange.max !== '') {
      const maxVal = Number(refundValueRange.max);
      result = result.filter((r) => {
        const amt = Number(
          r.refundBreakdown?.grandTotal ?? r.totalRefundAmount ?? r.refundAmount ?? 0,
        );
        return amt <= maxVal;
      });
    }

    // 7. Sort By
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      const amtA = Number(
        a.refundBreakdown?.grandTotal ?? a.totalRefundAmount ?? a.refundAmount ?? 0,
      );
      const amtB = Number(
        b.refundBreakdown?.grandTotal ?? b.totalRefundAmount ?? b.refundAmount ?? 0,
      );

      switch (sortBy) {
        case 'Oldest first':
          return timeA - timeB;
        case 'Refund amount ↑':
          return amtA - amtB;
        case 'Refund amount ↓':
          return amtB - amtA;
        case 'Items count ↓':
          return (b.items?.length || 0) - (a.items?.length || 0);
        case 'Newest first':
        default:
          return timeB - timeA;
      }
    });

    return result;
  }, [
    returnsList,
    searchTerm,
    savedView,
    returnTypeFilter,
    statusDropdownFilter,
    dateFilter,
    customDateRange,
    refundValueRange,
    sortBy,
  ]);

  // Operational Ledger Reconciliation Metrics
  const codStats = useMemo(() => {
    const listToCalculate = filteredReturns.length > 0 ? filteredReturns : returnsList;
    const totalVolume = listToCalculate.reduce(
      (sum, r) => sum + Number(r.refundBreakdown?.productTotal || r.refundAmount || 0),
      0,
    );
    const pendingRemittance = listToCalculate
      .filter((r) =>
        ['submitted', 'approved', 'return_courier_assigned', 'return_picked_up'].includes(r.status),
      )
      .reduce((sum, r) => sum + Number(r.refundBreakdown?.grandTotal || r.refundAmount || 0), 0);
    const courierDeductions = listToCalculate.reduce(
      (sum, r) => sum + Number(r.refundBreakdown?.restockingFee || 0),
      0,
    );
    const netPayouts =
      stats.totalRefundAmount ||
      listToCalculate
        .filter((r) => ['completed', 'refund_completed'].includes(r.status))
        .reduce((sum, r) => sum + Number(r.refundBreakdown?.grandTotal || r.refundAmount || 0), 0);

    return {
      totalVolume,
      pendingRemittance,
      courierDeductions,
      netPayouts,
    };
  }, [filteredReturns, returnsList, stats.totalRefundAmount]);

  // Active filter badge count for filter button
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (savedView !== 'All Returns') count++;
    if (sortBy !== 'Newest first') count++;
    if (returnTypeFilter !== 'All') count++;
    if (statusDropdownFilter !== 'All') count++;
    if (dateFilter !== 'All Time') count++;
    if (refundValueRange.min !== '' || refundValueRange.max !== '') count++;
    return count;
  }, [savedView, sortBy, returnTypeFilter, statusDropdownFilter, dateFilter, refundValueRange]);

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredReturns.map((r) => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Bulk Approve Returns',
      message: `Are you sure you want to approve ${selectedIds.length} return requests?`,
      confirmText: 'Approve All',
      type: 'info',
    });
    if (!confirmed) return;
    await performBulkAction({ ids: selectedIds, action: 'approve' });
    setSelectedIds([]);
    fetchReturnsList();
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm({
      title: 'Bulk Reject Returns',
      message: `Are you sure you want to reject ${selectedIds.length} return requests?`,
      confirmText: 'Reject All',
      type: 'danger',
    });
    if (!confirmed) return;
    await performBulkAction({ ids: selectedIds, action: 'reject' });
    setSelectedIds([]);
    fetchReturnsList();
  };

  // Status transitions
  const handleApproveReturn = async (req, e) => {
    if (e) e.stopPropagation();
    const confirmed = await confirm({
      title: 'Approve Return Request',
      message: 'Are you sure you want to approve this return request?',
      confirmText: 'Approve',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      setUpdatingStatusId(req._id);
      await transitionStatus(req._id, {
        nextStatus: 'approved',
        reason: 'Approved by admin from Returns',
      });
      await fetchReturnsList({ search: searchTerm });
      toast.success('Return request approved');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to approve return');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleRejectReturn = async (req, e) => {
    if (e) e.stopPropagation();
    const reason = await confirm({
      title: 'Reject Return Request',
      message: 'Please provide a reason for rejecting this return request:',
      isPrompt: true,
      promptPlaceholder: 'Enter rejection reason...',
      confirmText: 'Reject Request',
      type: 'danger',
    });
    if (!reason || typeof reason !== 'string') return;
    try {
      setUpdatingStatusId(req._id);
      await transitionStatus(req._id, {
        nextStatus: 'rejected',
        reason,
      });
      await fetchReturnsList({ search: searchTerm });
      toast.success('Return request rejected');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reject return');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleReturnStatusUpdate = async (id, nextStatus) => {
    try {
      setUpdatingStatusId(id);
      await transitionStatus(id, {
        nextStatus,
        reason: `Status changed to ${nextStatus.replace(/_/g, ' ')} by Admin`,
      });
      await fetchReturnsList({ search: searchTerm });
      // Update selectedReturn in drawer
      setSelectedReturn((prev) =>
        prev && prev._id === id ? { ...prev, status: nextStatus } : prev,
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCardStatusChange = async (req, targetStatus) => {
    if (targetStatus === req.status) return;
    if (targetStatus === 'rejected') {
      handleRejectReturn(req);
      return;
    }
    const confirmed = await confirm({
      title: 'Update Return Status',
      message: `Change request status to "${targetStatus.replace(/_/g, ' ')}"?`,
      confirmText: 'Update Status',
      type: 'info',
    });
    if (!confirmed) return;
    handleReturnStatusUpdate(req._id, targetStatus);
  };

  const triggerRefund = async (id, method = 'original') => {
    const confirmed = await confirm({
      title: 'Trigger Refund',
      message: 'Are you sure you want to process this refund to the customer?',
      confirmText: 'Process Refund',
      type: 'info',
    });
    if (!confirmed) return;
    try {
      await api.post(`/returns/admin/${id}/refund`, { method });
      toast.success('Refund triggered successfully!');
      fetchReturnsList({ search: searchTerm });
      setSelectedReturn((prev) =>
        prev && prev._id === id ? { ...prev, status: 'refund_initiated' } : prev,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger refund');
    }
  };

  const handleSettleRefund = async (id, settlementData) => {
    await settleRefund(id, settlementData);
    fetchReturnsList({ search: searchTerm });
    setSelectedReturn((prev) =>
      prev && prev._id === id ? { ...prev, status: 'completed' } : prev,
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    const listToExport = filteredReturns.length > 0 ? filteredReturns : returnsList;
    if (!listToExport || listToExport.length === 0) {
      toast.error('No returns to export');
      return;
    }
    const headers = [
      'Return ID',
      'Order ID',
      'Customer',
      'Email',
      'Phone',
      'Type',
      'Amount (INR)',
      'Status',
      'Date',
    ];

    const rows = listToExport.map((r) => [
      `"${r.returnId || r._id}"`,
      `"${r.orderId?.orderId || r.orderId?._id || r.orderId || 'N/A'}"`,
      `"${(r.userId?.name || r.user?.name || r.customer?.name || 'Guest User').replace(/"/g, '""')}"`,
      `"${r.userId?.email || r.user?.email || r.customer?.email || ''}"`,
      `"${r.pickup?.address?.phone || r.userId?.phone || r.user?.phone || ''}"`,
      `"${r.returnType || 'return'}"`,
      r.refundBreakdown?.grandTotal || r.refundAmount || 0,
      `"${r.status || 'submitted'}"`,
      `"${r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `returns_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Returns exported to CSV');
  };

  const openDrawerForReturn = (req) => {
    setSelectedReturn(req);
    setIsDrawerOpen(true);
  };

  const renderFilterFields = (
    <div className="space-y-4 text-[12px]">
      {/* Saved Views (Quick Filters) */}
      <div>
        <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
          Saved Views (Quick Filters)
        </label>
        <select
          value={savedView}
          onChange={handleSavedViewChange}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-accent)] cursor-pointer"
        >
          <option value="All Returns">View: All Returns</option>
          <option value="Needs Attention">Needs Attention (Submitted)</option>
          <option value="Pending Pickup">Pending Pickup (Courier Assigned)</option>
          <option value="Pending Inspection">Pending QC Inspection</option>
          <option value="Refund Ready">Refund Ready (QC Passed)</option>
          <option value="Completed & Settled">Completed & Settled</option>
          <option value="High Fraud Risk">High Fraud Risk Flagged</option>
        </select>
      </div>

      {/* Sort By */}
      <div>
        <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer font-medium"
        >
          <option value="Newest first">Newest first</option>
          <option value="Oldest first">Oldest first</option>
          <option value="Refund amount ↑">Refund amount ↑</option>
          <option value="Refund amount ↓">Refund amount ↓</option>
          <option value="Items count ↓">Items count ↓</option>
        </select>
      </div>

      {/* Request Type */}
      <div>
        <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
          Request Type
        </label>
        <select
          value={returnTypeFilter}
          onChange={(e) => setReturnTypeFilter(e.target.value)}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer font-medium"
        >
          <option value="All">All Types</option>
          <option value="return">Returns Only</option>
          <option value="exchange">Exchanges Only</option>
        </select>
      </div>

      {/* Lifecycle Status */}
      <div>
        <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
          Lifecycle Status
        </label>
        <select
          value={statusDropdownFilter}
          onChange={(e) => setStatusDropdownFilter(e.target.value)}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer font-medium"
        >
          <option value="All">All Statuses</option>
          <option value="submitted">Submitted (Needs Review)</option>
          <option value="approved">Approved</option>
          <option value="return_courier_assigned">Courier Assigned</option>
          <option value="return_picked_up">Item Picked Up</option>
          <option value="return_received">Received at Hub</option>
          <option value="inspection_started">QC Started</option>
          <option value="inspection_completed">QC Passed</option>
          <option value="refund_initiated">Refund Initiated</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Date Range */}
      <div>
        <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
          Date Range
        </label>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] outline-none cursor-pointer font-medium"
        >
          <option value="All Time">All Time</option>
          <option value="Today">Today</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
          <option value="This Month">This Month</option>
          <option value="Custom">Custom Range...</option>
        </select>
      </div>

      {dateFilter === 'Custom' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[9.5px] font-bold text-[var(--admin-text-tertiary)] uppercase block mb-1">
              From
            </label>
            <input
              type="date"
              value={customDateRange.from}
              onChange={(e) =>
                setCustomDateRange((prev) => ({
                  ...prev,
                  from: e.target.value,
                }))
              }
              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] outline-none"
            />
          </div>
          <div>
            <label className="text-[9.5px] font-bold text-[var(--admin-text-tertiary)] uppercase block mb-1">
              To
            </label>
            <input
              type="date"
              value={customDateRange.to}
              onChange={(e) =>
                setCustomDateRange((prev) => ({
                  ...prev,
                  to: e.target.value,
                }))
              }
              className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] outline-none"
            />
          </div>
        </div>
      )}

      {/* Refund Value Range */}
      <div>
        <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-2 block">
          Refund Amount (₹)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min ₹"
            value={refundValueRange.min}
            onChange={(e) =>
              setRefundValueRange((prev) => ({
                ...prev,
                min: e.target.value,
              }))
            }
            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none"
          />
          <input
            type="number"
            placeholder="Max ₹"
            value={refundValueRange.max}
            onChange={(e) =>
              setRefundValueRange((prev) => ({
                ...prev,
                max: e.target.value,
              }))
            }
            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[12px] outline-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-28 sm:pb-12 text-left"
    >
      {/* ─── EXECUTIVE PAGE HEADER ─── */}
      {!hideHeader && (
        <PageHeader
          title="Returns"
          actionRowMobile
          headerAction={
            <div className="hidden sm:inline-flex items-center bg-[var(--admin-surface-muted)] dark:bg-stone-800/60 p-0.5 rounded-[6px] border border-[var(--admin-border)] shrink-0">
              <button
                type="button"
                onClick={() => navigate('/admin/returns')}
                className="h-[26px] sm:h-[28px] px-2 sm:px-2.5 rounded-[4px] flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-[12px] font-bold bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs border border-stone-200/90 dark:border-stone-700/80"
                title="Returns Page"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">
                  assignment_return
                </span>
                <span>Returns</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/exchanges')}
                className="h-[26px] sm:h-[28px] px-2 sm:px-2.5 rounded-[4px] flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                title="Switch to Exchanges"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">
                  swap_horiz
                </span>
                <span>Exchanges</span>
              </button>
            </div>
          }
          subtitle={
            loading && !returnsList.length ? (
              <span>Loading returns...</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {filteredReturns.length} Total Returns
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {returnsList.filter((r) => r.status === 'submitted').length ||
                    stats.pendingReturns ||
                    0}{' '}
                  Awaiting Action
                </span>
              </div>
            )
          }
        />
      )}

      {/* Search & Actions Bar: Sticky below top navbar */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2 sm:py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md flex flex-col gap-2">
        {/* Mobile Combined Switcher on top of search bar */}
        <div className="flex sm:hidden items-center bg-[var(--admin-surface-muted)] dark:bg-stone-800/60 p-1 rounded-[6px] border border-[var(--admin-border)] w-full">
          <button
            type="button"
            onClick={() => navigate('/admin/returns')}
            className="flex-1 h-[32px] rounded-[4px] flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all cursor-pointer bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs border border-stone-200/90 dark:border-stone-700/80"
          >
            <span className="material-symbols-outlined text-[15px] leading-none">
              assignment_return
            </span>
            <span>Returns</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/exchanges')}
            className="flex-1 h-[32px] rounded-[4px] flex items-center justify-center gap-1.5 text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] leading-none">swap_horiz</span>
            <span>Exchanges</span>
          </button>
        </div>

        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar - Height exactly matches FilterBar/Actions (42px) */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search returns..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Action Controls Group (no overflow clipping so dropdowns open on laptop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Filters Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeFilterCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm font-semibold'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Return Filters"
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

              {/* Desktop Filter Popover (sm and up) */}
              {!isMobile && (
                <AnimatePresence>
                  {showFiltersMenu && (
                    <>
                      <div
                        onClick={() => setShowFiltersMenu(false)}
                        className="fixed inset-0 z-[60]"
                      />

                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 z-[70] w-[340px] bg-[var(--admin-surface)] rounded-[6px] shadow-2xl border border-[var(--admin-border-strong)] flex flex-col p-4 text-left"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                            Return Filters
                          </h3>
                          {activeFilterCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] text-[10px] font-bold">
                              {activeFilterCount} active
                            </span>
                          )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto scrollbar-hide pr-0.5">
                          {renderFilterFields}
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--admin-border-subtle)] flex gap-2">
                          <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="admin-btn-outline flex-1 justify-center py-2 !rounded-[4px] text-[12px] font-semibold cursor-pointer"
                          >
                            Clear All
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFiltersMenu(false)}
                            className="admin-btn-primary flex-1 justify-center py-2 !rounded-[4px] text-[12px] font-semibold cursor-pointer"
                          >
                            Apply Filters
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* View Mode Toggle (Table / Kanban) */}
            <div className="flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 h-[42px] min-h-[42px] max-h-[42px] box-border">
              <button
                type="button"
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
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
                title="Cards View"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  view_kanban
                </span>
              </button>
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
      </div>

      <div className="space-y-6">
        {/* Real-time Logistics & Return Remittance Reconciliation Ledger */}
        <motion.div
          variants={fadeUp}
          className="admin-card overflow-hidden text-left relative p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
            <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                COD Order Volume
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {formatCurrency(codStats.totalVolume)}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Total COD orders
              </span>
            </div>
            <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
                Collections Pending
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {formatCurrency(codStats.pendingRemittance)}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Awaiting transfer
              </span>
            </div>
            <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                Shipping Deductions
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-error)]">
                {formatCurrency(codStats.courierDeductions)}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Logistics fees
              </span>
            </div>
            <div className="p-5 space-y-1 bg-[var(--admin-success-light)] border-l-0">
              <span className="text-[10px] text-[var(--admin-success)] font-bold uppercase tracking-wider">
                Net Bank Payouts
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-success)]">
                {formatCurrency(codStats.netPayouts)}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Settled payouts
              </span>
            </div>
          </div>
        </motion.div>

        {/* Contextual Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-2.5 px-4 bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border-strong)] shadow-xs"
          >
            <span className="font-bold text-[13px] text-[var(--admin-text-primary)]">
              {selectedIds.length} return{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkApprove}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-[3px] transition-colors cursor-pointer"
              >
                Approve Selected
              </button>
              <button
                type="button"
                onClick={handleBulkReject}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold rounded-[3px] transition-colors cursor-pointer"
              >
                Reject Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] text-[12px] font-semibold cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── TABLE VIEW (Desktop / Tablet) ─── */}
      <AnimatePresence mode="wait">
        {loading && !returnsList.length ? (
          <motion.div key="loading" initial="hidden" animate="show" exit="hidden" variants={fadeUp}>
            <SkeletonTable rows={8} cols={7} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="w-full"
          >
            {viewMode === 'table' ? (
              <div className="hidden md:block admin-card overflow-x-auto p-0 !rounded-[4px] border border-[var(--admin-border)] shadow-xs text-left">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="admin-table w-full min-w-[1100px] text-left">
                    <thead>
                      <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] text-[11px] uppercase tracking-wider font-bold text-[var(--admin-text-tertiary)]">
                        <th className="py-3 px-4 whitespace-nowrap min-w-[150px] !bg-[var(--admin-surface-muted)]">
                          Return ID
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap min-w-[160px] !bg-[var(--admin-surface-muted)]">
                          Customer
                        </th>
                        <th className="py-3 px-4 min-w-[280px] !bg-[var(--admin-surface-muted)]">
                          Returned Items
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap min-w-[140px] !bg-[var(--admin-surface-muted)]">
                          Refund Amount
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap min-w-[190px] !bg-[var(--admin-surface-muted)]">
                          Status
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap text-right pr-5 min-w-[90px] !bg-[var(--admin-surface-muted)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--admin-border-subtle)]">
                      {filteredReturns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center">
                            <EmptyState
                              icon={searchTerm || activeFilterCount > 0 ? 'search_off' : 'undo'}
                              title={
                                searchTerm || activeFilterCount > 0
                                  ? 'No Matches Found'
                                  : 'No Return Requests'
                              }
                              description={
                                searchTerm || activeFilterCount > 0
                                  ? 'No return records match your search criteria or active filters.'
                                  : 'There are currently no return requests.'
                              }
                              actionText={
                                activeFilterCount > 0 || searchTerm
                                  ? 'Clear All Filters'
                                  : undefined
                              }
                              onAction={
                                activeFilterCount > 0 || searchTerm
                                  ? () => {
                                      handleResetAllFilters();
                                      setSearchTerm('');
                                    }
                                  : undefined
                              }
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredReturns.map((req) => {
                          const statusKey = (req.status || 'submitted').toLowerCase();
                          const statusCfg = RETURN_STATUS_CONFIG[statusKey] || {
                            label: req.status || 'Submitted',
                            color: 'bg-stone-100 text-stone-700 border-stone-300',
                            ribbon: 'bg-stone-600',
                          };
                          const customerName =
                            req.userId?.name ||
                            req.user?.name ||
                            req.customer?.name ||
                            req.customerName ||
                            'Guest User';
                          const customerPhone =
                            req.pickup?.address?.phone ||
                            req.userId?.phone ||
                            req.user?.phone ||
                            req.customer?.phone ||
                            '';
                          const customerEmail =
                            req.userId?.email || req.user?.email || req.customer?.email || '';

                          const firstItem = req.items?.[0];
                          const totalRefund =
                            req.refundBreakdown?.grandTotal ??
                            req.totalRefundAmount ??
                            req.refundAmount ??
                            0;
                          const isNew =
                            req.createdAt &&
                            new Date().getTime() - new Date(req.createdAt).getTime() <
                              24 * 60 * 60 * 1000;
                          const firstImg = getReturnItemImage(firstItem);
                          const itemTitle = getReturnItemTitle(firstItem);
                          const isRefundSettled =
                            ['refund_completed', 'completed'].includes(statusKey) ||
                            Boolean(req.refundRecordId) ||
                            Boolean(req.refundId);

                          return (
                            <tr
                              key={req._id}
                              onClick={() => navigate(getRequestDetailUrl(req))}
                              className="group hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer text-[12.5px]"
                            >
                              {/* Return ID & Order Reference */}
                              <td className="font-semibold text-[var(--admin-text-primary)] py-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[var(--admin-text-primary)] text-[13px]">
                                      #{req.returnId || req._id.substring(0, 8).toUpperCase()}
                                    </span>
                                    {isNew && (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                                        title="Recent return request"
                                      />
                                    )}
                                  </div>
                                  {req.orderId && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/orders/${req.orderId._id || req.orderId}`);
                                      }}
                                      className="text-[11px] font-mono text-[var(--admin-accent)] hover:underline font-semibold cursor-pointer w-max mt-0.5"
                                      title="View Original Order"
                                    >
                                      Ord: #
                                      {req.orderId.orderCode ||
                                        req.orderId.orderId ||
                                        (req.orderId._id || req.orderId).toString().substring(0, 8)}
                                    </span>
                                  )}
                                  <span className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                                    {new Date(req.createdAt).toLocaleDateString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </td>

                              {/* Customer Column */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span
                                    className="font-semibold text-[var(--admin-text-primary)] truncate max-w-[160px]"
                                    title={customerName}
                                  >
                                    {customerName}
                                  </span>
                                  {customerPhone && (
                                    <span className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px]">
                                        call
                                      </span>
                                      {customerPhone}
                                    </span>
                                  )}
                                  {customerEmail ? (
                                    <span
                                      className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 flex items-center gap-1 truncate max-w-[160px]"
                                      title={customerEmail}
                                    >
                                      <span className="material-symbols-outlined text-[12px]">
                                        mail
                                      </span>
                                      {customerEmail}
                                    </span>
                                  ) : req.pickup?.address?.city ? (
                                    <span className="text-[10.5px] text-[var(--admin-text-secondary)] mt-0.5 flex items-center gap-1 truncate max-w-[160px]">
                                      <span className="material-symbols-outlined text-[12px]">
                                        location_on
                                      </span>
                                      {req.pickup.address.city}, {req.pickup.address.state || ''}
                                    </span>
                                  ) : null}
                                </div>
                              </td>

                              {/* Returned Items Preview */}
                              <td className="min-w-[280px] py-3 px-4">
                                {firstItem ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 bg-[var(--admin-surface-muted)] p-2 rounded border border-[var(--admin-border-subtle)]">
                                      {firstImg ? (
                                        <img
                                          src={firstImg}
                                          alt=""
                                          className="w-9 h-9 object-cover rounded border border-[var(--admin-border)] shrink-0 bg-white dark:bg-stone-900 shadow-2xs"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.style.display = 'none';
                                            if (e.currentTarget.nextElementSibling) {
                                              e.currentTarget.nextElementSibling.style.display =
                                                'flex';
                                            }
                                          }}
                                        />
                                      ) : null}
                                      <div
                                        className={`w-9 h-9 rounded bg-stone-100 dark:bg-stone-800 border border-[var(--admin-border)] items-center justify-center text-stone-400 shrink-0 ${
                                          firstImg ? 'hidden' : 'flex'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          inventory_2
                                        </span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">
                                            Returning
                                          </span>
                                          {req.items?.length > 1 && (
                                            <span className="text-[9px] font-bold text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0">
                                              +{req.items.length - 1} more
                                            </span>
                                          )}
                                        </div>
                                        <p
                                          className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                                          title={itemTitle}
                                        >
                                          {itemTitle}
                                          <span className="ml-1 text-[var(--admin-text-tertiary)] font-semibold">
                                            (x
                                            {firstItem?.returnQuantity || firstItem?.quantity || 1})
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                    {firstItem?.reason && (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 w-fit max-w-full">
                                        <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400 shrink-0">
                                          info
                                        </span>
                                        <span className="truncate">
                                          <span className="font-semibold text-amber-950 dark:text-amber-200">
                                            Reason:
                                          </span>{' '}
                                          {firstItem.reason}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[var(--admin-text-tertiary)] italic">
                                    No items listed
                                  </span>
                                )}
                              </td>

                              {/* Refund Amount */}
                              <td className="whitespace-nowrap min-w-[140px] py-3 px-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                                    {formatCurrency(totalRefund)}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded w-max">
                                    {req.refundMethod === 'original'
                                      ? 'Original Source'
                                      : req.refundMethod
                                        ? req.refundMethod.replace(/_/g, ' ')
                                        : 'Original Source'}
                                  </span>
                                  {isRefundSettled && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-max">
                                      <span className="material-symbols-outlined text-[12px]">
                                        verified
                                      </span>
                                      Settled
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status / Action Dropdown */}
                              <td className="whitespace-nowrap min-w-[190px] py-3 px-4">
                                <div className="flex flex-col items-start gap-1.5">
                                  {statusKey === 'submitted' ? (
                                    <div className="flex items-center gap-1.5 w-max">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApproveReturn(req, e);
                                        }}
                                        disabled={updatingStatusId === req._id}
                                        className="h-9 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-[6px] flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50 transition-colors"
                                      >
                                        {updatingStatusId === req._id ? (
                                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <span className="material-symbols-outlined text-[16px]">
                                            check_circle
                                          </span>
                                        )}
                                        <span>Approve</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRejectReturn(req, e);
                                        }}
                                        disabled={updatingStatusId === req._id}
                                        className="h-9 bg-white dark:bg-stone-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-[6px] border border-red-200 dark:border-red-800/60 px-3 shadow-2xs cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">
                                          close
                                        </span>
                                        <span>Reject</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className="flex items-center gap-1.5 w-max"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="relative w-[170px] h-9">
                                        <select
                                          value={req.status || 'approved'}
                                          onChange={(e) =>
                                            handleCardStatusChange(req, e.target.value)
                                          }
                                          disabled={updatingStatusId === req._id}
                                          className="w-full h-9 !min-h-[36px] !max-h-[36px] appearance-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[6px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors disabled:opacity-50 truncate"
                                        >
                                          {RETURN_STATUS_OPTIONS.map((opt) => (
                                            <option
                                              key={opt.value}
                                              value={opt.value}
                                              disabled={opt.value === 'submitted'}
                                            >
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                                          {updatingStatusId === req._id ? (
                                            <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <span className="material-symbols-outlined text-[16px]">
                                              expand_more
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="text-right pr-5 py-3 px-4">
                                <div
                                  className="flex items-center justify-end gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => navigate(getRequestDetailUrl(req))}
                                    className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] tooltip-trigger"
                                    title="View Request Details"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      visibility
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
              </div>
            ) : null}

            {/* ─── CARDS VIEW (Full grid on kanban mode, or mobile only on table mode) ─── */}
            <div
              className={
                viewMode === 'kanban'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1'
                  : 'md:hidden flex flex-col gap-3 pt-1'
              }
            >
              {filteredReturns.length === 0 ? (
                <div className="py-12 text-center admin-card !rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <EmptyState
                    icon={searchTerm || activeFilterCount > 0 ? 'search_off' : 'undo'}
                    title={
                      searchTerm || activeFilterCount > 0 ? 'No Matches Found' : 'No Returns Found'
                    }
                    description={
                      searchTerm || activeFilterCount > 0
                        ? 'There are no return requests matching the selected filters or search criteria.'
                        : 'There are currently no return requests.'
                    }
                    actionText={
                      activeFilterCount > 0 || searchTerm ? 'Clear All Filters' : undefined
                    }
                    onAction={
                      activeFilterCount > 0 || searchTerm
                        ? () => {
                            handleResetAllFilters();
                            setSearchTerm('');
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                filteredReturns.map((req) => {
                  const statusKey = (req.status || 'submitted').toLowerCase();
                  const statusCfg = RETURN_STATUS_CONFIG[statusKey] || {
                    label: req.status || 'Submitted',
                    color: 'bg-stone-100 text-stone-700 border-stone-300',
                    ribbon: 'bg-stone-600',
                  };
                  const customerName =
                    req.userId?.name ||
                    req.user?.name ||
                    req.customer?.name ||
                    req.customerName ||
                    'Guest User';
                  const customerPhone =
                    req.pickup?.address?.phone ||
                    req.userId?.phone ||
                    req.user?.phone ||
                    req.customer?.phone ||
                    '';
                  const customerEmail =
                    req.userId?.email || req.user?.email || req.customer?.email || '';
                  const firstItem = req.items?.[0];
                  const totalRefund =
                    req.refundBreakdown?.grandTotal ??
                    req.totalRefundAmount ??
                    req.refundAmount ??
                    0;
                  const isNew =
                    req.createdAt &&
                    new Date().getTime() - new Date(req.createdAt).getTime() < 24 * 60 * 60 * 1000;
                  const firstImg = getReturnItemImage(firstItem);
                  const itemTitle = getReturnItemTitle(firstItem);
                  const isExpanded = expandedCardIds.has(req._id);
                  const isRefundSettled =
                    ['refund_completed', 'completed'].includes(statusKey) ||
                    Boolean(req.refundRecordId) ||
                    Boolean(req.refundId);

                  return (
                    <div
                      key={req._id}
                      onClick={() => navigate(getRequestDetailUrl(req))}
                      className="relative overflow-hidden rounded-[8px] p-3.5 shadow-xs border border-stone-200/90 dark:border-stone-700/80 bg-white dark:bg-stone-900 flex flex-col gap-3 cursor-pointer hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm transition-all text-left"
                    >
                      {/* Header: Return ID + Order Ref + Customer + Status Pill */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                              #{req.returnId || req._id.substring(0, 8).toUpperCase()}
                            </span>
                            {req.orderId && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/orders/${req.orderId._id || req.orderId}`);
                                }}
                                className="font-mono text-[11px] text-[var(--admin-text-secondary)] font-medium hover:text-[var(--admin-accent)] hover:underline cursor-pointer"
                                title="View Original Order"
                              >
                                #
                                {req.orderId.orderCode ||
                                  req.orderId.orderId ||
                                  (req.orderId._id || req.orderId).toString().substring(0, 8)}
                              </span>
                            )}
                            {req.returnType && req.returnType !== 'return' && (
                              <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800">
                                {req.returnType}
                              </span>
                            )}
                            {isNew && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping"
                                title="Recent return request"
                              />
                            )}
                          </div>
                          <span className="text-[12px] font-medium text-[var(--admin-text-secondary)] block mt-0.5 truncate">
                            {customerName}
                          </span>
                        </div>
                        <AdminStatusPill status={statusCfg.label} className="shrink-0" />
                      </div>

                      {/* Product Item Box (Matches Exchange Item Box) */}
                      <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[6px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2">
                        {/* Return Item Thumbnail & Details */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt=""
                              className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shrink-0 shadow-2xs"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-11 h-11 rounded-[4px] bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 items-center justify-center text-stone-400 shrink-0 ${
                              firstImg ? 'hidden' : 'flex'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              inventory_2
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-extrabold text-amber-700 dark:text-amber-500 uppercase tracking-wider block leading-tight">
                                RETURN
                              </span>
                              {req.items?.length > 1 && (
                                <span className="text-[9px] font-bold text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0">
                                  +{req.items.length - 1} more
                                </span>
                              )}
                            </div>
                            <div className="flex items-baseline justify-between gap-1 mt-0.5">
                              <p
                                className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                                title={itemTitle}
                              >
                                {itemTitle}
                              </p>
                              <span className="text-[11px] text-[var(--admin-text-secondary)] font-semibold shrink-0">
                                ×{firstItem?.returnQuantity || firstItem?.quantity || 1}
                              </span>
                            </div>
                            {firstItem?.reason ? (
                              <span className="inline-block text-[10px] text-amber-800 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 mt-1 truncate max-w-full">
                                {firstItem.reason}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5">
                                {req.items?.length || 1} item{req.items?.length > 1 ? 's' : ''} in
                                this return
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financial Breakdown & Status Badge Strip */}
                      <div className="flex items-center justify-between pt-0.5 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                            Refund:
                          </span>
                          <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px] whitespace-nowrap">
                            {formatCurrency(totalRefund)}
                          </span>
                          <span className="text-[9.5px] uppercase font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                            {req.refundMethod === 'original'
                              ? 'Original Source'
                              : req.refundMethod
                                ? req.refundMethod.replace(/_/g, ' ')
                                : 'Original Source'}
                          </span>
                          {isRefundSettled && (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[4px]">
                              <span className="material-symbols-outlined text-[11px]">
                                verified
                              </span>
                              Settled
                            </span>
                          )}
                        </div>

                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0 ${
                              isRefundSettled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : statusKey === 'refund_initiated'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                  : ['rejected', 'cancelled'].includes(statusKey)
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {isRefundSettled
                                ? 'check_circle'
                                : statusKey === 'refund_initiated'
                                  ? 'sync'
                                  : ['rejected', 'cancelled'].includes(statusKey)
                                    ? 'cancel'
                                    : 'schedule'}
                            </span>
                            {isRefundSettled
                              ? 'SETTLED'
                              : statusKey === 'refund_initiated'
                                ? 'INITIATED'
                                : ['rejected', 'cancelled'].includes(statusKey)
                                  ? 'CANCELLED'
                                  : 'PENDING'}
                          </span>
                        </div>
                      </div>

                      {/* Status Action Section:
                          - When submitted: show APPROVE RETURN & REJECT buttons, plus Details toggle
                          - Symmetrical 2-column grid for dropdown and details button
                      */}
                      {statusKey === 'submitted' ? (
                        <div
                          className="flex items-center justify-between pt-2 border-t border-stone-200/70 dark:border-stone-700/60 gap-2 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* APPROVE RETURN Button (Green / Emerald with 6px border-radius) */}
                            <button
                              type="button"
                              onClick={(e) => handleApproveReturn(req, e)}
                              disabled={updatingStatusId === req._id}
                              className="flex-1 min-w-0 h-9 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 px-3 shadow-2xs cursor-pointer border-0 disabled:opacity-50"
                            >
                              {updatingStatusId === req._id ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                              ) : (
                                <span className="material-symbols-outlined text-[16px] shrink-0">
                                  check_circle
                                </span>
                              )}
                              <span className="truncate">Approve Return</span>
                            </button>

                            {/* REJECT Button (Matching 6px border-radius) */}
                            <button
                              type="button"
                              onClick={(e) => handleRejectReturn(req, e)}
                              disabled={updatingStatusId === req._id}
                              className="h-9 px-3 rounded-[6px] border border-red-200 text-red-700 bg-white hover:bg-red-50 active:scale-95 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px] text-red-600">
                                cancel
                              </span>
                              <span>Reject</span>
                            </button>
                          </div>

                          {/* Expandable Details Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandCard(req._id);
                            }}
                            className={`h-9 px-2.5 rounded-[6px] border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              isExpanded
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                            }`}
                            title="Toggle Return Details"
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

                          {/* Symmetrical 2-Column Grid: Exact Equal Width & Height for both Status Dropdown and Details Button */}
                          <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                            {/* Box 1: Status Dropdown */}
                            <div className="relative w-full h-9">
                              <select
                                value={req.status || 'approved'}
                                onChange={(e) => handleCardStatusChange(req, e.target.value)}
                                disabled={updatingStatusId === req._id}
                                className="w-full h-9 !min-h-[36px] !max-h-[36px] appearance-none bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 text-[11px] font-bold rounded-[6px] pl-2.5 pr-7 cursor-pointer shadow-2xs outline-none focus:border-amber-500 transition-colors disabled:opacity-50 truncate"
                              >
                                {RETURN_STATUS_OPTIONS.map((opt) => (
                                  <option
                                    key={opt.value}
                                    value={opt.value}
                                    disabled={opt.value === 'submitted'}
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                                {updatingStatusId === req._id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span className="material-symbols-outlined text-[16px]">
                                    expand_more
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Box 2: Details Toggle Button (Matching 36px Height, 50% Width, and 6px Radius) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandCard(req._id);
                              }}
                              className={`w-full h-9 !min-h-[36px] !max-h-[36px] rounded-[6px] border text-[11px] font-bold flex items-center justify-between px-2.5 transition-colors cursor-pointer shadow-2xs ${
                                isExpanded
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                  : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
                              }`}
                              title="Toggle Return Details"
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
                            key={`return-details-${req._id}`}
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
                              {/* Customer Contact: Equally aligned 2-column grid matching controls sideways */}
                              <div className="grid grid-cols-2 gap-2 items-center text-[11px] text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 px-2.5 py-2 rounded-[6px] border border-stone-200/60 dark:border-stone-700/60">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-400 shrink-0 select-none">
                                    call
                                  </span>
                                  <a
                                    href={`tel:${customerPhone}`}
                                    className="font-semibold text-stone-800 dark:text-stone-200 hover:underline truncate leading-tight inline-flex items-center"
                                  >
                                    {customerPhone
                                      ? customerPhone.replace('+91', '').trim()
                                      : 'No phone'}
                                  </a>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {customerPhone ? (
                                    <>
                                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                                      <a
                                        href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${customerPhone.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate leading-tight inline-flex items-center"
                                      >
                                        WhatsApp
                                      </a>
                                    </>
                                  ) : customerEmail ? (
                                    <>
                                      <span className="material-symbols-outlined !text-[15px] !leading-none text-stone-400 shrink-0 select-none">
                                        mail
                                      </span>
                                      <a
                                        href={`mailto:${customerEmail}`}
                                        className="font-medium text-stone-700 dark:text-stone-300 hover:underline truncate leading-tight inline-flex items-center"
                                      >
                                        {customerEmail}
                                      </a>
                                    </>
                                  ) : (
                                    <span className="text-stone-400 text-[10px]">No contact</span>
                                  )}
                                </div>
                              </div>

                              {/* Return Reason */}
                              {firstItem?.reason && (
                                <div className="text-[11px] bg-amber-500/5 border border-amber-500/20 p-2 rounded-[6px] text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                                  <span className="material-symbols-outlined text-[14px] mt-0.5 text-amber-600 shrink-0">
                                    info
                                  </span>
                                  <div>
                                    <span className="font-bold">Reason:</span> {firstItem.reason}
                                  </div>
                                </div>
                              )}

                              {/* Pickup Address */}
                              {(req.pickup?.address || req.pickupAddress) && (
                                <div className="text-[11px] bg-stone-50 dark:bg-stone-800 p-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/70 flex items-start gap-1.5">
                                  <span className="material-symbols-outlined text-[14px] mt-0.5 text-stone-400 shrink-0">
                                    location_on
                                  </span>
                                  <div className="text-stone-700 dark:text-stone-300 leading-snug">
                                    <span className="font-bold text-stone-900 dark:text-stone-100">
                                      Pickup Address:
                                    </span>{' '}
                                    {req.pickup?.address?.line1 ||
                                      req.pickup?.address?.address ||
                                      req.pickup?.address?.city ||
                                      'Address on file'}
                                    {req.pickup?.address?.city
                                      ? `, ${req.pickup.address.city}`
                                      : ''}
                                    {req.pickup?.address?.postalCode
                                      ? ` - ${req.pickup.address.postalCode}`
                                      : ''}
                                  </div>
                                </div>
                              )}

                              {/* Return Items List (if multiple items) */}
                              {req.items?.length > 1 && (
                                <div className="bg-stone-50 dark:bg-stone-800/60 p-2 rounded-[6px] border border-stone-200/60 dark:border-stone-700/60 flex flex-col gap-1 text-[10.5px]">
                                  <span className="font-bold text-stone-500 uppercase tracking-wider text-[9px]">
                                    All Items ({req.items.length})
                                  </span>
                                  {req.items.map((it, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between items-center py-0.5"
                                    >
                                      <span className="truncate text-stone-800 dark:text-stone-200 font-medium max-w-[200px]">
                                        {it.title || it.name || it.product?.title || 'Item'}{' '}
                                        <span className="text-stone-400">
                                          x{it.returnQuantity || it.quantity || 1}
                                        </span>
                                      </span>
                                      <span className="font-bold text-stone-700 dark:text-stone-300 shrink-0">
                                        {it.reason ? (
                                          <span className="text-[9.5px] text-amber-700 font-normal">
                                            {it.reason}
                                          </span>
                                        ) : it.price ? (
                                          formatCurrency(
                                            it.price * (it.returnQuantity || it.quantity || 1),
                                          )
                                        ) : (
                                          ''
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* UPI ID Info with Copy Button if present */}
                              {(req.upiId || req.refundDetails?.upiId) && (
                                <div className="flex items-center justify-between text-[11px] bg-stone-50 dark:bg-stone-800 p-2 rounded-[6px] border border-stone-200/70 dark:border-stone-700/70">
                                  <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 min-w-0 truncate">
                                    <span className="material-symbols-outlined text-[13px] text-stone-400">
                                      payments
                                    </span>
                                    <span className="font-mono font-bold text-stone-800 dark:text-stone-200 truncate">
                                      {req.upiId || req.refundDetails?.upiId}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        req.upiId || req.refundDetails?.upiId,
                                      );
                                      toast.success('UPI ID copied!');
                                    }}
                                    className="text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      content_copy
                                    </span>
                                    Copy
                                  </button>
                                </div>
                              )}

                              {/* Dates & Actions Strip */}
                              <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-700/80 space-y-2.5">
                                {/* Date & Tracking */}
                                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-0.5">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <span className="material-symbols-outlined text-[14px] text-stone-400">
                                      schedule
                                    </span>
                                    Requested on{' '}
                                    <strong className="text-stone-800 dark:text-stone-200 font-semibold">
                                      {formatDateDMY(req.createdAt)}
                                    </strong>
                                  </span>
                                  {req.pickup?.trackingId && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-blue-50 text-blue-700 border border-blue-200 text-[9.5px] font-bold font-mono">
                                      <span className="material-symbols-outlined text-[11px]">
                                        local_shipping
                                      </span>
                                      {req.pickup.trackingId}
                                    </span>
                                  )}
                                </div>

                                {/* Action Button */}
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => navigate(getRequestDetailUrl(req))}
                                    className="w-full h-9 px-2.5 rounded-[6px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-dark)] text-white text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                    title="View Return Details"
                                  >
                                    <span>View Details</span>
                                    <span className="material-symbols-outlined text-[15px] shrink-0">
                                      arrow_forward
                                    </span>
                                  </button>
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

      {/* ─── MOBILE FILTER APP DRAWER (Portal to document.body) ─── */}
      {isMobile &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showFiltersMenu && (
              <div
                className={`admin-section-root ${
                  document.documentElement.classList.contains('dark') ||
                  document.body.classList.contains('dark')
                    ? 'dark'
                    : ''
                }`}
              >
                {/* Backdrop overlay */}
                <motion.div
                  key="mobile-filter-drawer-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowFiltersMenu(false)}
                  className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs cursor-pointer"
                />

                {/* Mobile App Drawer (Bottom Sheet) */}
                <motion.div
                  key="mobile-filter-drawer-sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed bottom-0 inset-x-0 z-[9999] bg-[var(--admin-surface)] rounded-t-[6px] shadow-[0_-8px_30px_rgba(0,0,0,0.3)] border-t border-[var(--admin-border-strong)] flex flex-col max-h-[85vh] text-left overflow-hidden"
                >
                  {/* Grab Handle */}
                  <div
                    className="w-full flex justify-center pt-2.5 pb-1 shrink-0 cursor-pointer"
                    onClick={() => setShowFiltersMenu(false)}
                  >
                    <div className="w-10 h-1 rounded-[2px] bg-[var(--admin-border-strong)] opacity-60" />
                  </div>

                  {/* Drawer Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--admin-border-subtle)] shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                        tune
                      </span>
                      <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                        Return Filters
                      </h3>
                      {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--admin-accent)] text-white text-[10px] font-bold">
                          {activeFilterCount} Active
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFiltersMenu(false)}
                      className="w-7 h-7 rounded-[4px] flex items-center justify-center hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer transition-colors"
                      aria-label="Close filters"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  {/* Drawer Scrollable Content */}
                  <div
                    className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 touch-pan-y"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {renderFilterFields}
                  </div>

                  {/* Drawer Sticky Footer */}
                  <div className="p-3.5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] flex gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="admin-btn-outline flex-1 justify-center py-2.5 !rounded-[4px] text-[12.5px] font-semibold cursor-pointer"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFiltersMenu(false)}
                      className="admin-btn-primary flex-1 justify-center py-2.5 !rounded-[4px] text-[12.5px] font-semibold cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
}
