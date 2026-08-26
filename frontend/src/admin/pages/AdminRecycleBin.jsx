import React, { useState } from 'react';
import Download from 'lucide-react/dist/esm/icons/download';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import X from 'lucide-react/dist/esm/icons/x';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Info from 'lucide-react/dist/esm/icons/info';
import { useRecycleBin } from '../hooks/useRecycleBin';
import { useConfirm } from '../../context/ConfirmProvider';
import { useAdminSecurity } from '../hooks/useAdminSecurity';
import { recycleBinApi } from '../services/recycleBinService';
import { m as motion } from 'framer-motion';
import { PageHeader, EmptyState, SkeletonTable, fadeUp, stagger } from '../components/AdminUIKit';
const getThumbnail = (item) => {
  if (!item) return null;
  if (item.entityThumbnail) return item.entityThumbnail;
  if (!item.entityData) return null;
  return (
    item.entityData.imageSrc ||
    item.entityData.image ||
    item.entityData.heroImage ||
    item.entityData.thumbnail ||
    null
  );
};

const renderDetails = (data) => {
  if (!data) return null;
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (e) {}
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return <span className="text-[13px]">{String(parsed)}</span>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(parsed).map(([key, value]) => {
        if (
          key === '_id' ||
          key === '__v' ||
          key === 'createdAt' ||
          key === 'updatedAt' ||
          key === 'image' ||
          key === 'imageSrc'
        )
          return null;
        let displayValue = String(value);
        if (typeof value === 'object' && value !== null) {
          displayValue = JSON.stringify(value);
        }
        return (
          <div
            key={key}
            className="flex flex-col gap-1 border-b border-[var(--admin-border-subtle)] pb-2"
          >
            <span className="text-[11px] text-[var(--admin-text-tertiary)] uppercase font-semibold tracking-wider">
              {key}
            </span>
            <span className="text-[13px] text-[var(--admin-text-primary)] break-all">
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const AdminRecycleBin = () => {
  const {
    items,
    stats,
    purgePreview,
    loading,
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

  // Modal states
  const [previewModal, setPreviewModal] = useState({ isOpen: false, item: null });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, item: null, conflicts: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [emptyBinModal, setEmptyBinModal] = useState(false);
  const [cleanupReportModal, setCleanupReportModal] = useState({ isOpen: false, report: null });

  // ── Render Stats ──
  const renderStats = () => {
    if (!stats) return null;
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="admin-card p-3 sm:p-5 flex flex-col xl:flex-row items-center xl:items-start gap-2 sm:gap-4 border-t-4 xl:border-t-0 xl:border-l-4 border-[var(--admin-border)] text-center xl:text-left">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[var(--admin-text-secondary)] text-[16px] sm:text-[20px]">
              delete_sweep
            </span>
          </div>
          <div className="w-full">
            <p className="text-[9px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] tracking-wider uppercase mb-0.5 sm:mb-1 truncate">
              Total Deleted
            </p>
            <p className="text-lg sm:text-2xl font-bold text-[var(--admin-text-primary)]">
              {stats.totalDeleted}
            </p>
          </div>
        </div>
        <div className="admin-card p-3 sm:p-5 flex flex-col xl:flex-row items-center xl:items-start gap-2 sm:gap-4 border-t-4 xl:border-t-0 xl:border-l-4 border-emerald-500 text-center xl:text-left">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
            <span className="material-symbols-outlined text-[16px] sm:text-[20px]">restore</span>
          </div>
          <div className="w-full">
            <p className="text-[9px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] tracking-wider uppercase mb-0.5 sm:mb-1 truncate">
              Restored (30d)
            </p>
            <p className="text-lg sm:text-2xl font-bold text-[var(--admin-text-primary)]">
              {stats.restoredThisMonth}
            </p>
          </div>
        </div>
        <div className="admin-card p-3 sm:p-5 flex flex-col xl:flex-row items-center xl:items-start gap-2 sm:gap-4 border-t-4 xl:border-t-0 xl:border-l-4 border-amber-500 text-center xl:text-left">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-amber-600">
            <span className="material-symbols-outlined text-[16px] sm:text-[20px]">schedule</span>
          </div>
          <div className="w-full">
            <p className="text-[9px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] tracking-wider uppercase mb-0.5 sm:mb-1 truncate">
              Expiring Week
            </p>
            <p className="text-lg sm:text-2xl font-bold text-[var(--admin-text-primary)]">
              {stats.expiringThisWeek}
            </p>
          </div>
        </div>
        <div className="admin-card p-3 sm:p-5 flex flex-col xl:flex-row items-center xl:items-start gap-2 sm:gap-4 border-t-4 xl:border-t-0 xl:border-l-4 border-rose-500 text-center xl:text-left">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
            <span className="material-symbols-outlined text-[16px] sm:text-[20px]">
              auto_delete
            </span>
          </div>
          <div className="w-full">
            <p className="text-[9px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] tracking-wider uppercase mb-0.5 sm:mb-1 truncate">
              Auto-Purged
            </p>
            <p className="text-lg sm:text-2xl font-bold text-[var(--admin-text-primary)]">
              {stats.autoPurgedThisMonth}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── Handlers ──
  const handleRestoreClick = async (item) => {
    try {
      // Direct optimistic restore first
      const result = await restoreItem(item._id);
    } catch (err) {
      if (err.message.includes('HTTP 409')) {
        // Conflict detected, open conflict resolution modal
        try {
          const res = await recycleBinApi.checkConflicts(item._id);
          setRestoreModal({ isOpen: true, item, conflicts: res.data });
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handlePermanentDeleteClick = async (item) => {
    if (
      await confirm({
        title: 'Permanent Delete',
        message: `Are you sure you want to permanently delete ${item.entityName}? This action cannot be undone.`,
        type: 'danger',
      })
    ) {
      const result = await permanentDelete(item._id);
      if (result.success && result.report) {
        setCleanupReportModal({ isOpen: true, report: result.report });
      }
    }
  };

  const executeRestoreWithResolution = async (autoRename, restoreDependencies) => {
    const item = restoreModal.item;
    setRestoreModal({ isOpen: false, item: null, conflicts: null });

    await restoreItem(item._id, { autoRenameConflicts: autoRename, restoreDependencies });
  };

  // ── Render Modals ──
  const renderPreviewModal = () => {
    if (!previewModal.isOpen || !previewModal.item) return null;
    const { item } = previewModal;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => setPreviewModal({ isOpen: false, item: null })}
      >
        <div
          className="bg-[var(--admin-surface)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border-subtle)]">
            <h2>{item.entityName} Preview</h2>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors"
              onClick={() => setPreviewModal({ isOpen: false, item: null })}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4 text-[var(--admin-text-secondary)] text-[14px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center min-h-[200px]">
                {getThumbnail(item) ? (
                  <img
                    src={getThumbnail(item)}
                    className="w-full h-full object-cover"
                    alt="Thumbnail"
                  />
                ) : (
                  <div className="entity-icon-fallback" style={{ width: '100%', height: '150px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>
                      image
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 text-[13px]">
                  <label>Type</label>
                  <span>{item.entityTypeDisplay}</span>
                </div>
                <div className="flex flex-col gap-1 text-[13px]">
                  <label>Deleted Date</label>
                  <span>{new Date(item.deletedAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1 text-[13px]">
                  <label>Deleted By</label>
                  <span>{item.deletedBy?.email || 'System'}</span>
                </div>
                {item.deleteReason && (
                  <div className="flex flex-col gap-1 text-[13px]">
                    <label>Reason</label>
                    <span>{item.deleteReason}</span>
                  </div>
                )}
              </div>
            </div>

            {item.entityData && (
              <>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  Original Data
                </h3>
                <div className="bg-[var(--admin-surface-muted)] p-4 rounded-xl border border-[var(--admin-border)]">
                  {renderDetails(item.entityData)}
                </div>
              </>
            )}

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
              Version History
            </h3>
            <div className="flex flex-col gap-3 border-l-2 border-[var(--admin-border)] pl-4 ml-2">
              {item.versionHistory?.map((entry, idx) => (
                <div key={idx} className={`history-item ${entry.action}`}>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{entry.action}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    by {entry.performedBy?.email || 'System'} on{' '}
                    {new Date(entry.performedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => setPreviewModal({ isOpen: false, item: null })}
            >
              Close
            </button>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => {
                setPreviewModal({ isOpen: false, item: null });
                handleRestoreClick(item);
              }}
            >
              <span className="material-symbols-outlined">restore</span> Restore
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConflictModal = () => {
    if (!restoreModal.isOpen || !restoreModal.item) return null;
    const { item, conflicts } = restoreModal;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => setRestoreModal({ isOpen: false, item: null, conflicts: null })}
      >
        <div
          className="bg-[var(--admin-surface)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border-subtle)]">
            <h2>Restore Conflict Detected</h2>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors"
              onClick={() => setRestoreModal({ isOpen: false, item: null, conflicts: null })}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4 text-[var(--admin-text-secondary)] text-[14px]">
            <p>
              We cannot restore <strong>{item.entityName}</strong> normally because it conflicts
              with existing data.
            </p>

            {conflicts?.conflicts?.length > 0 && (
              <div className="flex gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <strong>Unique Field Conflict</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    Another item is already using the following field(s):
                  </p>
                  <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                    {conflicts.conflicts.map((c, i) => (
                      <li key={i}>
                        {c.field}: {c.existingValue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {conflicts?.dependencyWarnings?.length > 0 && (
              <div
                className="flex gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700"
                style={{
                  background: 'var(--info-light)',
                  borderColor: 'var(--info-main)',
                  color: 'var(--info-dark)',
                }}
              >
                <Info className="w-5 h-5 shrink-0" />
                <div>
                  <strong>Missing Dependencies</strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    The parent entity for this item has also been deleted:
                  </p>
                  <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                    {conflicts.dependencyWarnings.map((d, i) => (
                      <li key={i}>
                        {d.entityName} ({d.entityType})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => setRestoreModal({ isOpen: false, item: null, conflicts: null })}
            >
              Cancel
            </button>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => executeRestoreWithResolution(true, true)}
            >
              Auto-Resolve & Restore
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteModal = () => {
    return null;
  };

  const renderCleanupReportModal = () => {
    if (!cleanupReportModal.isOpen || !cleanupReportModal.report) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => setCleanupReportModal({ isOpen: false, report: null })}
      >
        <div
          className="bg-[var(--admin-surface)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border-subtle)]">
            <h2>Cleanup Report</h2>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors"
              onClick={() => setCleanupReportModal({ isOpen: false, report: null })}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4 text-[var(--admin-text-secondary)] text-[14px]">
            <p>
              The permanent deletion process has completed. Here is the summary of cleared
              resources:
            </p>
            <div className="flex flex-col gap-3 mt-4">
              {cleanupReportModal.report.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]"
                >
                  <span className={`material-symbols-outlined ${step.status}`}>
                    {step.status === 'success'
                      ? 'check_circle'
                      : step.status === 'failed'
                        ? 'error'
                        : 'remove_circle_outline'}
                  </span>
                  <div className="flex flex-col gap-1 text-[13px]">
                    <strong>{step.step}</strong>
                    {step.count !== undefined && <span>Count: {step.count}</span>}
                    {step.details && <span>{step.details}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]">
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => setCleanupReportModal({ isOpen: false, report: null })}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader title="Recycle Bin" icon="delete_sweep" iconColor="danger" mobileRow={true} />

      <motion.div variants={fadeUp}>{renderStats()}</motion.div>

      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row items-stretch gap-2 w-full mb-6"
      >
        <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
            search
          </span>
          <input
            type="text"
            placeholder="Search deleted items..."
            onChange={handleSearchChange}
            className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-10"
          />
        </div>
        <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="relative flex items-stretch shrink-0">
            <select
              className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none min-w-0 max-w-[150px] truncate"
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Product">Products</option>
              <option value="Category">Categories</option>
              <option value="Order">Orders</option>
              <option value="Review">Reviews</option>
              <option value="Gallery">Gallery</option>
            </select>
            <span
              className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              expand_more
            </span>
          </div>
          <div className="relative flex items-stretch shrink-0">
            <select
              className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none min-w-0 max-w-[160px] truncate"
              value={filters.timeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              <option value="">Any Time</option>
              <option value="today">Deleted Today</option>
              <option value="7days">Deleted Last 7 Days</option>
              <option value="expiring_soon">Expiring Soon (3d)</option>
              <option value="expired">Expired</option>
            </select>
            <span
              className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              expand_more
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 lg:ml-auto">
            <button
              className="px-3 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded border border-[var(--admin-border)] flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 gap-1.5 font-semibold text-[13px] h-10 sm:h-10"
              onClick={() => recycleBinApi.exportAuditLogs()}
              title="Export Logs"
            >
              <Download className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {isOwner && (
              <button
                className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 gap-1.5 font-semibold text-[13px] h-10 sm:h-10 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/50"
                onClick={() => setEmptyBinModal(true)}
                title="Empty Bin"
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Empty</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {selectedIds.size > 0 && (
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between bg-[var(--admin-surface-muted)] p-4 rounded-xl border border-[var(--admin-border)]"
        >
          <div className="flex items-center gap-2 text-[var(--admin-text-primary)] font-medium">
            <span className="material-symbols-outlined text-[20px]">check_box</span>
            {selectedIds.size} items selected
          </div>
          <div className="flex items-center gap-3">
            <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={bulkRestore}>
              Restore Selected
            </button>
            {isSuperAdmin && (
              <button
                className="admin-btn admin-btn-danger admin-btn-sm"
                onClick={bulkPermanentDelete}
              >
                Delete Selected
              </button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="auto_awesome"
            title="Recycle Bin is Empty"
            description="No deleted items found matching your criteria."
          />
        ) : (
          <div className="admin-card divide-y divide-[var(--admin-border-subtle)] p-0">
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="pl-6 w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === items.length && items.length > 0}
                        onChange={() => selectAll(items.map((i) => i._id))}
                        className="rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]"
                      />
                    </th>
                    <th>Entity</th>
                    <th>Deleted By</th>
                    <th>Deleted Date</th>
                    <th>Status</th>
                    <th className="text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-[var(--admin-surface-muted)] transition-colors"
                    >
                      <td className="pl-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item._id)}
                          onChange={() => toggleSelection(item._id)}
                          className="rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          {getThumbnail(item) ? (
                            <>
                              <img
                                src={getThumbnail(item)}
                                className="w-10 h-10 rounded-md object-cover border border-[var(--admin-border)] shrink-0"
                                alt=""
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling)
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-10 h-10 rounded-md bg-[var(--admin-surface)] hidden items-center justify-center border border-[var(--admin-border)] shrink-0">
                                <span className="material-symbols-outlined text-[var(--admin-text-tertiary)] text-[18px]">
                                  image_not_supported
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-[var(--admin-surface)] flex items-center justify-center border border-[var(--admin-border)] shrink-0">
                              <span className="material-symbols-outlined text-[var(--admin-text-tertiary)] text-[18px]">
                                inventory_2
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                              {item.entityName}
                            </span>
                            <span className="text-[11px] text-[var(--admin-text-secondary)]">
                              {item.entityTypeDisplay}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] text-[var(--admin-text-secondary)]">
                          {item.deletedBy?.email || 'System'}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] text-[var(--admin-text-secondary)]">
                          {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        {item.isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-600 border border-rose-200">
                            Expired
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                              item.daysRemaining > 7
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : item.daysRemaining > 3
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">timer</span>
                            {item.daysRemaining} days left
                          </span>
                        )}
                      </td>
                      <td className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors"
                            onClick={() => setPreviewModal({ isOpen: true, item })}
                            title="Preview"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              visibility
                            </span>
                          </button>
                          <button
                            className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-emerald-600 transition-colors"
                            onClick={() => handleRestoreClick(item)}
                            title="Restore"
                          >
                            <span className="material-symbols-outlined text-[18px]">restore</span>
                          </button>
                          {isSuperAdmin && (
                            <button
                              className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-rose-600 transition-colors"
                              onClick={() => handlePermanentDeleteClick(item)}
                              title="Permanent Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                delete_forever
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {renderPreviewModal()}
      {renderConflictModal()}
      {renderDeleteModal()}
      {renderCleanupReportModal()}
    </motion.div>
  );
};

export default AdminRecycleBin;
