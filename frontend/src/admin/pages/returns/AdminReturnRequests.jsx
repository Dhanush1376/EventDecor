import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  SkeletonList,
  FilterBar,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

const STATUS_OPTIONS = [
  'All',
  'submitted',
  'approved',
  'pickup_assigned',
  'inspection_started',
  'completed',
  'rejected',
];

const AdminReturnRequests = () => {
  const navigate = useNavigate();
  const { returnsList, pagination, fetchReturnsList, loading, error, performBulkAction } =
    useReturnManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'fraud' (Saved Filters Req #13)

  useEffect(() => {
    const timer = setTimeout(() => {
      let filterParams = { search: searchTerm };

      if (statusFilter !== 'All') {
        filterParams.status = statusFilter;
      }

      if (activeTab === 'pending') {
        filterParams.status = 'submitted';
      } else if (activeTab === 'fraud') {
        filterParams.fraudScore = 50;
      }

      fetchReturnsList(filterParams);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchReturnsList, searchTerm, statusFilter, activeTab]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(returnsList.map((r) => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((itemId) => itemId !== id));
    }
  };

  const handleBulkApprove = () => {
    if (window.confirm(`Are you sure you want to approve ${selectedIds.length} returns?`)) {
      performBulkAction('approve', selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkReject = () => {
    if (window.confirm(`Are you sure you want to reject ${selectedIds.length} returns?`)) {
      performBulkAction('reject', selectedIds);
      setSelectedIds([]);
    }
  };

  if (error && !returnsList?.length) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load returns"
        description={error}
        action={
          <button className="admin-btn admin-btn-primary" onClick={() => fetchReturnsList()}>
            Try Again
          </button>
        }
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Return Requests"
        subtitle="Manage customer returns, approvals, and reverse logistics"
        icon="keyboard_return"
        iconColor="orders"
        headerAction={
          <button className="admin-btn admin-btn-outline min-h-[36px]">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full flex flex-col sm:flex-row justify-between gap-4">
          <div className="sm:max-w-md w-full">
            <FilterBar
              filters={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setActiveTab('all');
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[var(--admin-text-secondary)]">View:</span>
            <div className="flex bg-[var(--admin-surface-muted)] p-1 rounded-lg border border-[var(--admin-border-subtle)]">
              {['all', 'pending', 'fraud'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors border ${
                    activeTab === type
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-sm)] border-[var(--admin-border)]'
                      : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]'
                  }`}
                >
                  {type === 'pending' ? 'Pending Today' : type === 'fraud' ? 'High Risk' : 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div variants={fadeUp} className="admin-card">
        <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center px-4 pt-4">
          <div className="w-full sm:max-w-[250px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] text-[18px]">
              search
            </span>
            <input
              type="text"
              className="admin-input !pl-10 py-2 w-full text-[12px]"
              placeholder="Search Return ID, Order ID, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 bg-[var(--admin-surface-hover)] px-4 py-2 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]"
              >
                <span className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
                  {selectedIds.length} selected
                </span>
                <button
                  className="admin-btn admin-btn-sm admin-btn-outline !border-[var(--admin-success)] !text-[var(--admin-success)] hover:!bg-[var(--admin-success-light)]"
                  onClick={handleBulkApprove}
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Approve
                </button>
                <button
                  className="admin-btn admin-btn-sm admin-btn-outline !border-[var(--admin-error)] !text-[var(--admin-error)] hover:!bg-[var(--admin-error-light)]"
                  onClick={handleBulkReject}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Reject
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading && !returnsList?.length ? (
          <>
            <div className="hidden md:block">
              <SkeletonTable cols={8} rows={5} className="border-0 shadow-none bg-transparent" />
            </div>
            <div className="md:hidden">
              <SkeletonList items={5} className="border-0 shadow-none bg-transparent" />
            </div>
          </>
        ) : returnsList?.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon="undo"
              title="No return requests found"
              description="Try adjusting your filters or search query"
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="w-12 pl-5">
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={
                          returnsList.length > 0 && selectedIds.length === returnsList.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Return ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Refund Amt</th>
                    <th>Status</th>
                    <th>Pickup / Inspection</th>
                    <th>SLA Status</th>
                    <th className="text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsList.map((req) => (
                    <tr
                      key={req._id}
                      className={req.sla?.isOverdue ? 'bg-[var(--admin-domain-danger-bg)]' : ''}
                    >
                      <td className="pl-5">
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={selectedIds.includes(req._id)}
                          onChange={(e) => handleSelectOne(e, req._id)}
                        />
                      </td>
                      <td>
                        <Link
                          to={`/admin/returns/requests/${req._id}`}
                          className="font-semibold text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-colors"
                        >
                          {req.returnId}
                        </Link>
                        <div className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                          Ord:{' '}
                          {String(req.orderId?._id || req.orderId || '')
                            .substring(String(req.orderId?._id || req.orderId || '').length - 8)
                            .toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-[var(--admin-text-primary)]">
                          {req.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-[12px] text-[var(--admin-text-tertiary)]">
                          {req.userId?.email}
                        </div>
                      </td>
                      <td>
                        <div className="text-[13px] font-medium text-[var(--admin-text-secondary)]">
                          {req.items?.length} item(s)
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-[var(--admin-text-primary)]">
                          ₹{(req.refundBreakdown?.grandTotal || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] font-medium text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                          {req.refundMethod}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td>
                        {req.sla?.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[var(--admin-domain-danger)] text-[12px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[var(--admin-domain-success)] text-[12px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>
                            On Track
                          </span>
                        )}
                      </td>
                      <td>
                        {req.pickup?.status ? (
                          <div className="text-[11px] text-[var(--admin-text-secondary)] mb-1 whitespace-nowrap flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">
                              local_shipping
                            </span>
                            {req.pickup.status.replace('_', ' ').toUpperCase()}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[var(--admin-text-tertiary)] mb-1">
                            -
                          </div>
                        )}

                        {req.items?.some((i) => i.warehouseStatus) ? (
                          <div className="text-[11px] text-[var(--admin-text-secondary)] whitespace-nowrap flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">
                              fact_check
                            </span>
                            {req.items[0].warehouseStatus.replace('_', ' ').toUpperCase()}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[var(--admin-text-tertiary)]">-</div>
                        )}
                      </td>
                      <td className="text-right pr-5">
                        <button
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text-primary)] transition-all ml-auto"
                          onClick={() => navigate(`/admin/returns/requests/${req._id}`)}
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
              {returnsList.map((req) => (
                <div
                  key={req._id}
                  onClick={() => navigate(`/admin/returns/requests/${req._id}`)}
                  className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3 cursor-pointer hover:border-[var(--admin-border-strong)] transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                          {req.returnId}
                        </span>
                        {req.sla?.isOverdue && (
                          <span className="w-2 h-2 rounded-full bg-[var(--admin-domain-danger)] animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block">
                          {req.userId?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge
                      status={req.status}
                      className="border-none px-2 py-1 text-[10px]"
                    />
                  </div>

                  <div className="pt-2 pb-2 border-y border-[var(--admin-border-subtle)]">
                    <p className="text-[12px] text-[var(--admin-text-primary)] line-clamp-2">
                      {req.items?.length} item(s) - Refund: ₹
                      {(req.refundBreakdown?.grandTotal || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 border-t border-[var(--admin-border-subtle)] flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--admin-text-secondary)]">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="admin-btn admin-btn-outline min-w-[36px] min-h-[36px] p-0 flex items-center justify-center"
                disabled={pagination.page === 1}
                onClick={() => fetchReturnsList({ page: pagination.page - 1 })}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                className="admin-btn admin-btn-outline min-w-[36px] min-h-[36px] p-0 flex items-center justify-center"
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchReturnsList({ page: pagination.page + 1 })}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AdminReturnRequests;
