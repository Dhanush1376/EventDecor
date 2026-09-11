import { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useRecycleBin } from '../hooks/useRecycleBin';
import { useConfirm } from '../../context/ConfirmProvider';
import { useAdminSecurity } from '../hooks/useAdminSecurity';
import { recycleBinApi } from '../services/recycleBinService';
import { PageHeader, EmptyState, fadeUp, stagger } from '../components/AdminUIKit';
import { AdminRecycleBinSkeleton } from '../components/skeletons/pages/AdminRecycleBinSkeleton';
import { AdminActiveFilterChips, AdminFilterEmptyState } from '../components/filters';
import toast from 'react-hot-toast';

const ENTITY_TYPE_CONFIG = {
  all: { label: 'All Items', icon: 'auto_awesome', variant: 'neutral' },
  Product: { label: 'Products', icon: 'inventory_2', variant: 'info' },
  Category: { label: 'Categories', icon: 'category', variant: 'neutral' },
  Order: { label: 'Orders', icon: 'shopping_bag', variant: 'primary' },
  User: { label: 'Customers', icon: 'person', variant: 'success' },
  Review: { label: 'Reviews', icon: 'rate_review', variant: 'warning' },
  Gallery: { label: 'Gallery', icon: 'photo_library', variant: 'neutral' },
};

const getThumbnail = (item) => {
  if (!item) return null;
  if (item.entityThumbnail) return item.entityThumbnail;
  if (!item.entityData) return null;
  return (
    item.entityData.imageSrc ||
    item.entityData.image ||
    item.entityData.heroImage ||
    item.entityData.thumbnail ||
    item.entityData.images?.[0] ||
    null
  );
};

const formatEntityValue = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return `Array (${val.length} items)`;
    return JSON.stringify(val);
  }
  return String(val);
};

export default function AdminRecycleBin() {
  const {
    items,
    stats,
    loading,
    totalCount,
    page,
    limit,
    filters,
    selectedIds,
    setPage,
    handleFilterChange,
    handleSearchChange,
    toggleSelection,
    selectAll,
    restoreItem,
    permanentDelete,
    bulkRestore,
    bulkPermanentDelete,
    emptyBin,
    refresh,
  } = useRecycleBin();

  const { activeRole } = useAdminSecurity();
  const isSuperAdmin = activeRole === 'super_admin' || activeRole === 'owner';
  const isOwner = activeRole === 'owner';
  const confirm = useConfirm();

  // Local UI states
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    item: null,
    activeTab: 'data',
  });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, item: null, conflicts: null });
  const [emptyBinModal, setEmptyBinModal] = useState(false);
  const [cleanupReportModal, setCleanupReportModal] = useState({ isOpen: false, report: null });
  const [isExporting, setIsExporting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const onSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleClearSearch = () => {
    setSearchInput('');
    handleSearchChange({ target: { value: '' } });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await recycleBinApi.exportAuditLogs();
      toast.success('Recycle bin audit log exported successfully');
    } catch (err) {
      toast.error('Failed to export audit log');
    } finally {
      setIsExporting(false);
    }
  };

  // Restore flow with conflict handling
  const handleRestoreClick = async (item) => {
    setActionLoadingId(item._id);
    try {
      await restoreItem(item._id);
    } catch (err) {
      if (err.message && err.message.includes('HTTP 409')) {
        try {
          const res = await recycleBinApi.checkConflicts(item._id);
          setRestoreModal({ isOpen: true, item, conflicts: res.data });
        } catch (e) {
          toast.error('Failed to verify restore dependencies');
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const executeRestoreWithResolution = async (autoRename, restoreDependencies) => {
    const item = restoreModal.item;
    setRestoreModal({ isOpen: false, item: null, conflicts: null });
    if (!item) return;

    setActionLoadingId(item._id);
    try {
      await restoreItem(item._id, { autoRenameConflicts: autoRename, restoreDependencies });
    } catch (e) {
      toast.error('Could not auto-resolve conflict: ' + (e.message || 'Unknown error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanent delete flow
  const handlePermanentDeleteClick = async (item) => {
    const confirmed = await confirm({
      title: 'Permanent Deletion',
      message: `Permanently destroy "${item.entityName}"? This action bypasses the recycle bin and CANNOT be recovered.`,
      confirmText: 'Permanently Delete',
      type: 'danger',
    });

    if (!confirmed) return;

    setActionLoadingId(item._id);
    try {
      const result = await permanentDelete(item._id);
      if (result?.success && result?.report) {
        setCleanupReportModal({ isOpen: true, report: result.report });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Empty Bin flow
  const handleEmptyBinConfirm = async () => {
    setEmptyBinModal(false);
    await emptyBin();
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Normalized active chips for unified filter display
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.entityType && filters.entityType !== 'all') {
      const label = ENTITY_TYPE_CONFIG[filters.entityType]?.label || filters.entityType;
      chips.push({
        key: 'entityType',
        label: `Type: ${label}`,
        onRemove: () => handleFilterChange('entityType', 'all'),
      });
    }
    if (filters.timeRange) {
      const labels = {
        today: 'Deleted: Today',
        '7days': 'Deleted: Last 7 Days',
        expiring_soon: 'Retention: Expiring Soon (≤3d)',
        expired: 'Retention: Expired',
      };
      chips.push({
        key: 'timeRange',
        label: labels[filters.timeRange] || `Retention: ${filters.timeRange}`,
        onRemove: () => handleFilterChange('timeRange', ''),
      });
    }
    return chips;
  }, [filters.entityType, filters.timeRange]);

  const resetAllFilters = () => {
    setSearchInput('');
    handleSearchChange({ target: { value: '' } });
    handleFilterChange('entityType', 'all');
    handleFilterChange('timeRange', '');
  };

  // Render initial skeleton
  if (loading && items.length === 0) {
    return <AdminRecycleBinSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12 sm:pb-8"
    >
      {/* ── 1. Page Header (Styled like Orders Section - No Icon) ── */}
      <PageHeader
        title="Recycle Bin"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {totalCount} Total Deleted {totalCount === 1 ? 'Record' : 'Records'}
            </span>
            {stats?.expiringThisWeek > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {stats.expiringThisWeek} Expiring Soon
              </span>
            )}
            {(stats?.restoredThisMonth || 0) > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats.restoredThisMonth} Restored (30d)
              </span>
            )}
          </div>
        }
      />

      {/* ── 2. Sticky 42px Toolbar with Search & Controls ── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md">
        <div className="relative w-full">
          <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
            {/* Unified Search & Action Bar */}
            <form
              onSubmit={onSearchSubmit}
              className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center pl-3 pr-1.5 h-[42px] min-h-[42px] max-h-[42px] shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                placeholder="Search deleted records by name, ID, or user..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  handleSearchChange(e);
                }}
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2.5 h-full min-w-0"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0 mr-1"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}

              {/* Embedded Action Controls */}
              <div className="flex items-center gap-0.5 pl-1.5 border-l border-[var(--admin-border)] shrink-0">
                {/* Export CSV */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-8 h-8 rounded-[3px] hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-40"
                  title="Export Audit Logs as CSV"
                >
                  {isExporting ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[17px]">download</span>
                  )}
                </button>

                {/* Empty Bin (Owner Only) */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setEmptyBinModal(true)}
                    disabled={items.length === 0}
                    className="w-8 h-8 rounded-[3px] hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Permanently empty recycle bin"
                  >
                    <span className="material-symbols-outlined text-[17px]">delete_forever</span>
                  </button>
                )}

                {/* Refresh */}
                <button
                  type="button"
                  onClick={refresh}
                  className="w-8 h-8 rounded-[3px] hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  title="Refresh Data"
                >
                  <span className="material-symbols-outlined text-[17px]">refresh</span>
                </button>
              </div>
            </form>

            {/* Filter Dropdowns Group */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Entity Type Filter Select */}
              <div className="relative flex items-stretch shrink-0">
                <select
                  className="bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] text-[12px] font-bold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-[42px] min-h-[42px] max-h-[42px] appearance-none min-w-[125px] max-w-[145px] truncate shadow-2xs"
                  value={filters.entityType}
                  onChange={(e) => handleFilterChange('entityType', e.target.value)}
                >
                  <option value="all">All Entity Types</option>
                  <option value="Product">Products</option>
                  <option value="Category">Categories</option>
                  <option value="Order">Orders</option>
                  <option value="User">Customers</option>
                  <option value="Review">Reviews</option>
                  <option value="Gallery">Gallery</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Time / Retention Range Filter */}
              <div className="relative flex items-stretch shrink-0">
                <select
                  className="bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] text-[12px] font-bold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-[42px] min-h-[42px] max-h-[42px] appearance-none min-w-[130px] max-w-[155px] truncate shadow-2xs"
                  value={filters.timeRange}
                  onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                >
                  <option value="">Any Retention Time</option>
                  <option value="today">Deleted Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="expiring_soon">Expiring Soon (≤3d)</option>
                  <option value="expired">Expired</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Dedicated Bulk Action Bar - Overlaps entire searchbar in-place ── */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex flex-row items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] rounded-[4px] shadow-sm h-[42px] min-h-[42px] max-h-[42px] box-border"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[var(--admin-accent)]/15 flex items-center justify-center text-[11px] font-extrabold text-[var(--admin-accent)] shrink-0">
                    {selectedIds.size}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                    {selectedIds.size}{' '}
                    <span className="hidden xs:inline">
                      {selectedIds.size === 1 ? 'item' : 'items'}
                    </span>{' '}
                    selected
                  </span>
                  <button
                    type="button"
                    onClick={() => selectAll([])}
                    className="text-[11px] sm:text-[12px] text-[var(--admin-accent)] hover:underline cursor-pointer ml-1 font-semibold shrink-0"
                  >
                    Deselect all
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={bulkRestore}
                    className="h-7 sm:h-8 px-2 sm:px-3 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-[12px] font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                    title="Restore Selected"
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                      restore
                    </span>
                    <span className="hidden sm:inline">Restore Selected</span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={bulkPermanentDelete}
                      className="h-7 sm:h-8 px-2 sm:px-3 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white text-[11px] sm:text-[12px] font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                      title="Permanently Delete Selected"
                    >
                      <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                        delete_forever
                      </span>
                      <span className="hidden sm:inline">Delete Selected</span>
                    </button>
                  )}

                  <div className="w-[1px] h-5 sm:h-6 bg-[var(--admin-border-subtle)] mx-0.5 sm:mx-1" />

                  <button
                    type="button"
                    onClick={() => selectAll([])}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                    title="Clear Selection"
                  >
                    <span className="material-symbols-outlined text-[17px] sm:text-[18px]">
                      close
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Unified Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          onClearAll={resetAllFilters}
          totalMatches={totalCount}
          totalItems={stats?.totalItems || totalCount}
          itemName="deleted records"
        />
      </div>

      {/* ── 5. Main Content: Desktop Table & Mobile Cards ── */}
      <motion.div variants={fadeUp}>
        {items.length === 0 ? (
          filters.search || filters.entityType !== 'all' || filters.timeRange ? (
            <AdminFilterEmptyState
              title="No Matching Deleted Records"
              message="No deleted records matched your current query or filters."
              onReset={resetAllFilters}
            />
          ) : (
            <EmptyState
              icon="delete_sweep"
              title="Recycle Bin is Completely Empty"
              description="Everything is in order! When products, orders, or categories are soft-deleted, they will appear here."
            />
          )
        ) : (
          <>
            {/* Desktop Table View (≥ md screen) */}
            <div className="hidden md:block admin-card p-0 overflow-hidden border border-[var(--admin-border)] shadow-xs rounded-[6px]">
              <div className="overflow-x-auto">
                <table className="admin-table admin-table-compact w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] text-[11.5px] font-bold text-[var(--admin-text-secondary)]">
                      <th className="py-2.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === items.length && items.length > 0}
                          onChange={() => selectAll(items.map((i) => i._id))}
                          className="rounded border-[var(--admin-border)] text-amber-600 focus:ring-amber-500 cursor-pointer"
                          title="Select all on page"
                        />
                      </th>
                      <th className="py-2.5 px-4 min-w-[200px]">Item</th>
                      <th className="py-2.5 px-4 w-[160px]">Deleted By</th>
                      <th className="py-2.5 px-4 w-[120px]">Date</th>
                      <th className="py-2.5 px-4 w-[110px]">Expires</th>
                      <th className="py-2.5 px-4 text-right pr-5 w-[110px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
                    {items.map((item) => {
                      const thumb = getThumbnail(item);
                      const isSelected = selectedIds.has(item._id);
                      const isItemLoading = actionLoadingId === item._id;
                      const typeCfg = ENTITY_TYPE_CONFIG[item.entityType] || ENTITY_TYPE_CONFIG.all;

                      return (
                        <tr
                          key={item._id}
                          className={`hover:bg-[var(--admin-surface-muted)]/60 transition-colors ${
                            isSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(item._id)}
                              className="rounded border-[var(--admin-border)] text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>

                          {/* Entity Info */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="w-8 h-8 rounded-[4px] object-cover border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] shrink-0"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] flex items-center justify-center border border-[var(--admin-border)] shrink-0 ${
                                  thumb ? 'hidden' : 'flex'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                                  {typeCfg.icon || 'inventory_2'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewModal({ isOpen: true, item, activeTab: 'data' })
                                  }
                                  className="font-medium text-[13px] text-[var(--admin-text-primary)] hover:text-amber-600 dark:hover:text-amber-400 truncate text-left block cursor-pointer max-w-[240px]"
                                  title={item.entityName}
                                >
                                  {item.entityName || 'Unnamed Record'}
                                </button>
                                <span className="text-[11px] text-[var(--admin-text-tertiary)]">
                                  {item.entityTypeDisplay || item.entityType}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Deleted By */}
                          <td className="py-2.5 px-4">
                            <span
                              className="text-[12px] text-[var(--admin-text-secondary)] truncate block max-w-[150px]"
                              title={item.deletedBy?.email}
                            >
                              {item.deletedBy?.email || 'System'}
                            </span>
                          </td>

                          {/* Deleted Date */}
                          <td className="py-2.5 px-4 text-[12px] text-[var(--admin-text-secondary)] whitespace-nowrap">
                            {new Date(item.deletedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Retention Status */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {item.isExpired ? (
                              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                Expired
                              </span>
                            ) : item.daysRemaining <= 3 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
                                {item.daysRemaining}d left
                              </span>
                            ) : item.daysRemaining <= 7 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50">
                                {item.daysRemaining}d left
                              </span>
                            ) : (
                              <span className="text-[12px] text-[var(--admin-text-tertiary)] font-medium">
                                {item.daysRemaining} days left
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="py-2.5 px-4 text-right pr-5 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Restore */}
                              <button
                                type="button"
                                onClick={() => handleRestoreClick(item)}
                                disabled={isItemLoading}
                                className="h-7 px-2.5 rounded text-[11.5px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80 transition-colors cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                                title="Restore to production"
                              >
                                {isItemLoading ? (
                                  <span className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <span className="material-symbols-outlined text-[15px]">
                                    restore
                                  </span>
                                )}
                                <span>Restore</span>
                              </button>

                              {/* Permanent Delete */}
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteClick(item)}
                                  disabled={isItemLoading}
                                  className="w-7 h-7 rounded text-[var(--admin-text-tertiary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Permanently Delete"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View (< md screen) */}
            <div className="block md:hidden space-y-2.5">
              {items.map((item) => {
                const thumb = getThumbnail(item);
                const isSelected = selectedIds.has(item._id);
                const isItemLoading = actionLoadingId === item._id;
                const typeCfg = ENTITY_TYPE_CONFIG[item.entityType] || ENTITY_TYPE_CONFIG.all;

                return (
                  <div
                    key={item._id}
                    className={`admin-card p-3 border transition-all ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/5'
                        : 'border-[var(--admin-border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(item._id)}
                          className="rounded border-[var(--admin-border)] text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="w-8 h-8 rounded-[4px] object-cover border border-[var(--admin-border)] shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] flex items-center justify-center border border-[var(--admin-border)] shrink-0 ${
                            thumb ? 'hidden' : 'flex'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                            {typeCfg.icon || 'inventory_2'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({ isOpen: true, item, activeTab: 'data' })
                            }
                            className="font-medium text-[13px] text-[var(--admin-text-primary)] truncate text-left block cursor-pointer"
                          >
                            {item.entityName || 'Unnamed Record'}
                          </button>
                          <span className="text-[10.5px] text-[var(--admin-text-tertiary)]">
                            {item.entityTypeDisplay || item.entityType} •{' '}
                            {new Date(item.deletedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreClick(item)}
                          disabled={isItemLoading}
                          className="h-7 px-2 rounded text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">restore</span>
                          <span>Restore</span>
                        </button>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteClick(item)}
                            disabled={isItemLoading}
                            className="w-7 h-7 rounded text-stone-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 6. Pagination Controls ── */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-1 text-[12px] text-[var(--admin-text-secondary)]">
                <span>
                  Showing page <strong className="text-[var(--admin-text-primary)]">{page}</strong>{' '}
                  of <strong className="text-[var(--admin-text-primary)]">{totalPages}</strong> (
                  {totalCount} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 px-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-[var(--admin-text-primary)]">{page}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-8 px-3 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── 7. Item Data Preview Modal ── */}
      <AnimatePresence>
        {previewModal.isOpen && previewModal.item && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setPreviewModal({ isOpen: false, item: null, activeTab: 'data' })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[var(--admin-surface)] w-full max-w-2xl rounded-[8px] shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[20px] text-amber-600">
                    inventory_2
                  </span>
                  <h2 className="text-[15px] font-bold text-[var(--admin-text-primary)] truncate">
                    {previewModal.item.entityName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, item: null, activeTab: 'data' })}
                  className="w-8 h-8 rounded-full hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                {/* Hero / Thumbnail Banner */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-[6px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                  {getThumbnail(previewModal.item) ? (
                    <img
                      src={getThumbnail(previewModal.item)}
                      alt=""
                      className="w-20 h-20 rounded-[4px] object-cover border border-[var(--admin-border)] bg-[var(--admin-surface)] shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-[4px] bg-[var(--admin-surface)] flex items-center justify-center border border-[var(--admin-border)] shrink-0">
                      <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)]">
                        inventory_2
                      </span>
                    </div>
                  )}

                  <div className="space-y-1 flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="font-extrabold text-[14px] text-[var(--admin-text-primary)]">
                        {previewModal.item.entityName}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]">
                        {previewModal.item.entityTypeDisplay || previewModal.item.entityType}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--admin-text-secondary)]">
                      Deleted on {new Date(previewModal.item.deletedAt).toLocaleString()} by{' '}
                      <strong className="text-[var(--admin-text-primary)]">
                        {previewModal.item.deletedBy?.email || 'System Operator'}
                      </strong>
                    </p>
                    {previewModal.item.deleteReason && (
                      <p className="text-[11.5px] text-[var(--admin-text-tertiary)] italic">
                        Reason: &quot;{previewModal.item.deleteReason}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center border-b border-[var(--admin-border-subtle)] gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModal((p) => ({ ...p, activeTab: 'data' }))}
                    className={`pb-2 px-1 text-[12.5px] font-bold border-b-2 transition-colors cursor-pointer ${
                      previewModal.activeTab === 'data'
                        ? 'border-amber-600 text-[var(--admin-text-primary)]'
                        : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]'
                    }`}
                  >
                    Original Entity Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModal((p) => ({ ...p, activeTab: 'history' }))}
                    className={`pb-2 px-1 text-[12.5px] font-bold border-b-2 transition-colors cursor-pointer ${
                      previewModal.activeTab === 'history'
                        ? 'border-amber-600 text-[var(--admin-text-primary)]'
                        : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]'
                    }`}
                  >
                    Version History ({previewModal.item.versionHistory?.length || 0})
                  </button>
                </div>

                {/* Tab 1: Formatted Original Data */}
                {previewModal.activeTab === 'data' && (
                  <div className="space-y-3">
                    {previewModal.item.entityData ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(
                          typeof previewModal.item.entityData === 'string'
                            ? JSON.parse(previewModal.item.entityData)
                            : previewModal.item.entityData,
                        ).map(([key, val]) => {
                          if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) return null;
                          return (
                            <div
                              key={key}
                              className="p-2.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] space-y-0.5"
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                                {key.replace(/([A-Z])/g, ' $1')}
                              </span>
                              <span className="text-[12px] font-medium text-[var(--admin-text-primary)] break-all block">
                                {formatEntityValue(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--admin-text-tertiary)] italic">
                        No snapshot data available for this record.
                      </p>
                    )}
                  </div>
                )}

                {/* Tab 2: Version History */}
                {previewModal.activeTab === 'history' && (
                  <div className="space-y-2.5">
                    {previewModal.item.versionHistory?.length ? (
                      <div className="border-l-2 border-[var(--admin-border)] pl-4 ml-2 space-y-3">
                        {previewModal.item.versionHistory.map((h, i) => (
                          <div key={i} className="relative space-y-0.5">
                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <div className="text-[12.5px] font-bold text-[var(--admin-text-primary)] capitalize">
                              {h.action || 'Audit Event'}
                            </div>
                            <div className="text-[11px] text-[var(--admin-text-secondary)]">
                              By {h.performedBy?.email || 'System'} on{' '}
                              {new Date(h.performedAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--admin-text-tertiary)] italic">
                        No prior version history logged.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: false, item: null, activeTab: 'data' })}
                  className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] font-bold text-[12px] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const itm = previewModal.item;
                    setPreviewModal({ isOpen: false, item: null, activeTab: 'data' });
                    handleRestoreClick(itm);
                  }}
                  className="h-9 px-4 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">restore</span>
                  <span>Restore Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. Conflict Resolution Modal ── */}
      <AnimatePresence>
        {restoreModal.isOpen && restoreModal.item && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setRestoreModal({ isOpen: false, item: null, conflicts: null })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[var(--admin-surface)] w-full max-w-lg rounded-[8px] shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-border-subtle)] bg-amber-50 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <h2 className="text-[14.5px] font-bold">Restore Conflict Detected</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRestoreModal({ isOpen: false, item: null, conflicts: null })}
                  className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-[13px] text-[var(--admin-text-secondary)]">
                <p>
                  We cannot restore{' '}
                  <strong className="text-[var(--admin-text-primary)]">
                    {restoreModal.item.entityName}
                  </strong>{' '}
                  directly because of colliding unique fields or missing parent dependencies in the
                  live database.
                </p>

                {restoreModal.conflicts?.conflicts?.length > 0 && (
                  <div className="p-3 rounded-[4px] bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 space-y-1">
                    <strong className="text-[12px] uppercase tracking-wider block">
                      Field Collisions:
                    </strong>
                    <ul className="list-disc pl-4 text-[12px] space-y-0.5">
                      {restoreModal.conflicts.conflicts.map((c, idx) => (
                        <li key={idx}>
                          <strong>{c.field}:</strong> Already used by &quot;{c.existingValue}&quot;
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {restoreModal.conflicts?.dependencyWarnings?.length > 0 && (
                  <div className="p-3 rounded-[4px] bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 space-y-1">
                    <strong className="text-[12px] uppercase tracking-wider block">
                      Parent Dependencies Missing:
                    </strong>
                    <ul className="list-disc pl-4 text-[12px] space-y-0.5">
                      {restoreModal.conflicts.dependencyWarnings.map((d, idx) => (
                        <li key={idx}>
                          {d.entityName} ({d.entityType})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
                <button
                  type="button"
                  onClick={() => setRestoreModal({ isOpen: false, item: null, conflicts: null })}
                  className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] font-bold text-[12px] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeRestoreWithResolution(true, true)}
                  className="h-9 px-4 rounded-[4px] bg-amber-600 hover:bg-amber-500 text-white font-bold text-[12px] cursor-pointer shadow-2xs active:scale-95"
                >
                  Auto-Resolve & Restore
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 9. Empty Bin Confirmation Modal (Owner Only) ── */}
      <AnimatePresence>
        {emptyBinModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setEmptyBinModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[var(--admin-surface)] w-full max-w-md rounded-[8px] shadow-2xl border border-rose-300 dark:border-rose-900/60 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)]">
                    Permanently Empty Entire Recycle Bin?
                  </h3>
                  <p className="text-[12.5px] text-[var(--admin-text-secondary)] leading-relaxed">
                    This will permanently destroy all {totalCount} records currently in the bin,
                    clearing image assets and database logs. This operation cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
                <button
                  type="button"
                  onClick={() => setEmptyBinModal(false)}
                  className="h-9 px-4 rounded-[4px] border border-[var(--admin-border)] font-bold text-[12px] text-[var(--admin-text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmptyBinConfirm}
                  className="h-9 px-4 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-[12px] cursor-pointer shadow-2xs active:scale-95"
                >
                  Yes, Empty All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 10. Cleanup Report Modal ── */}
      <AnimatePresence>
        {cleanupReportModal.isOpen && cleanupReportModal.report && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setCleanupReportModal({ isOpen: false, report: null })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[var(--admin-surface)] w-full max-w-lg rounded-[8px] shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-border-subtle)]">
                <h2 className="text-[14.5px] font-bold text-[var(--admin-text-primary)]">
                  Cleanup Report
                </h2>
                <button
                  type="button"
                  onClick={() => setCleanupReportModal({ isOpen: false, report: null })}
                  className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
                <p className="text-[12.5px] text-[var(--admin-text-secondary)]">
                  Resource cleanup summary for this permanent deletion:
                </p>
                <div className="space-y-2 pt-2">
                  {cleanupReportModal.report.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[12px]"
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] shrink-0 ${
                          step.status === 'success'
                            ? 'text-emerald-600'
                            : step.status === 'failed'
                              ? 'text-rose-600'
                              : 'text-stone-400'
                        }`}
                      >
                        {step.status === 'success' ? 'check_circle' : 'remove_circle_outline'}
                      </span>
                      <div className="space-y-0.5">
                        <strong className="text-[var(--admin-text-primary)] block">
                          {step.step}
                        </strong>
                        {step.count !== undefined && (
                          <span className="text-[var(--admin-text-secondary)]">
                            Count: {step.count}
                          </span>
                        )}
                        {step.details && (
                          <span className="text-[var(--admin-text-tertiary)] block text-[11px]">
                            {step.details}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end px-5 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
                <button
                  type="button"
                  onClick={() => setCleanupReportModal({ isOpen: false, report: null })}
                  className="h-8 px-4 rounded-[4px] bg-[var(--admin-accent)] text-white font-bold text-[12px] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
