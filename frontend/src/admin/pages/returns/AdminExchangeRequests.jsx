import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  SkeletonList,
  StatCard,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

const AdminExchangeRequests = () => {
  const { exchangesList, pagination, fetchExchangesList, loading, error } = useReturnManagement();

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExchangesList({ search: searchTerm });
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchExchangesList, searchTerm]);

  if (error && !exchangesList?.length) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load exchanges"
        description={error}
        action={
          <button className="admin-btn admin-btn-primary" onClick={() => fetchExchangesList()}>
            Try Again
          </button>
        }
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Exchange Requests"
        subtitle="Manage product swaps, size/color exchanges, and price differences"
        icon="swap_horiz"
        iconColor="info"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Exchanges"
          value={exchangesList?.length || 0}
          icon="swap_horiz"
          domainColor="info"
        />
        <StatCard
          label="Pending Processing"
          value={
            exchangesList?.filter((e) => e.replacementStatus === 'pending_processing').length || 0
          }
          icon="pending_actions"
          domainColor="warning"
        />
        <StatCard
          label="Shipped"
          value={exchangesList?.filter((e) => e.replacementStatus === 'shipped').length || 0}
          icon="local_shipping"
          domainColor="success"
        />
        <StatCard
          label="Completed"
          value={exchangesList?.filter((e) => e.replacementStatus === 'completed').length || 0}
          icon="check_circle"
          domainColor="success"
        />
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
              placeholder="Search Exchange ID, Return ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading && !exchangesList?.length ? (
          <>
            <div className="hidden md:block">
              <SkeletonTable cols={7} rows={5} className="border-0 shadow-none bg-transparent" />
            </div>
            <div className="md:hidden">
              <SkeletonList items={5} className="border-0 shadow-none bg-transparent" />
            </div>
          </>
        ) : exchangesList?.length === 0 ? (
          <div className="p-10">
            <EmptyState icon="swap_horiz" title="No exchange requests found" />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="pl-5">Exchange ID</th>
                    <th>Customer</th>
                    <th>Original Item</th>
                    <th>Replacement Item</th>
                    <th>Price Diff (Req #21)</th>
                    <th>Status</th>
                    <th className="text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exchangesList.map((exc) => (
                    <tr key={exc._id}>
                      <td className="pl-5">
                        <div className="font-semibold text-[var(--admin-text-primary)]">
                          {exc.exchangeId}
                        </div>
                        <Link
                          to={`/admin/returns/requests/${exc.returnRequestId?._id}`}
                          className="text-[11px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] transition-colors mt-0.5 block"
                        >
                          Return: {exc.returnRequestId?.returnId}
                        </Link>
                      </td>
                      <td>
                        <div className="font-semibold text-[var(--admin-text-primary)]">
                          {exc.returnRequestId?.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-[12px] text-[var(--admin-text-tertiary)]">
                          {exc.returnRequestId?.userId?.email}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] overflow-hidden shrink-0">
                            <img
                              src={exc.originalItem.imageSrc || '/placeholder.png'}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]">
                              {exc.originalItem.title}
                            </div>
                            <div className="text-[11px] text-[var(--admin-text-tertiary)]">
                              {exc.originalItem.variant} × {exc.originalItem.quantity}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] overflow-hidden shrink-0">
                            <img
                              src={exc.replacementItem.imageSrc || '/placeholder.png'}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--admin-text-primary)] truncate max-w-[150px]">
                              {exc.replacementItem.title}
                            </div>
                            <div className="text-[11px] text-[var(--admin-text-tertiary)]">
                              {exc.replacementItem.variant} × {exc.replacementItem.quantity}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-[var(--admin-text-primary)]">
                          ₹{exc.priceDifference}
                        </div>
                        <div
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            exc.differenceAction === 'collect_payment'
                              ? 'text-[var(--admin-domain-warning)]'
                              : exc.differenceAction === 'refund_difference'
                                ? 'text-[var(--admin-domain-info)]'
                                : 'text-[var(--admin-domain-success)]'
                          }`}
                        >
                          {exc.differenceAction.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={exc.replacementStatus} />
                      </td>
                      <td className="text-right pr-5">
                        <button className="admin-btn admin-btn-sm admin-btn-secondary">
                          Process
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
              {exchangesList.map((exc) => (
                <div
                  key={exc._id}
                  className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                        {exc.exchangeId}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block">
                          {exc.returnRequestId?.userId?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge
                      status={exc.replacementStatus}
                      className="border-none px-2 py-1 text-[10px]"
                    />
                  </div>

                  <div className="pt-2 pb-2 border-y border-[var(--admin-border-subtle)] space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] overflow-hidden shrink-0">
                        <img
                          src={exc.originalItem.imageSrc || '/placeholder.png'}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--admin-text-primary)] line-clamp-1">
                          Original: {exc.originalItem.title}
                        </div>
                        <div className="text-[10px] text-[var(--admin-text-tertiary)]">
                          {exc.originalItem.variant}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] overflow-hidden shrink-0">
                        <img
                          src={exc.replacementItem.imageSrc || '/placeholder.png'}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--admin-text-primary)] line-clamp-1">
                          Replacement: {exc.replacementItem.title}
                        </div>
                        <div className="text-[10px] text-[var(--admin-text-tertiary)]">
                          {exc.replacementItem.variant}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--admin-text-primary)] text-[12px]">
                        ₹{exc.priceDifference}
                      </span>
                      <span className="text-[9px] font-bold uppercase text-[var(--admin-text-tertiary)]">
                        {exc.differenceAction.replace('_', ' ')}
                      </span>
                    </div>
                    <button className="admin-btn admin-btn-sm admin-btn-secondary">Process</button>
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
                onClick={() => fetchExchangesList({ page: pagination.page - 1 })}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                className="admin-btn admin-btn-outline min-w-[36px] min-h-[36px] p-0 flex items-center justify-center"
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchExchangesList({ page: pagination.page + 1 })}
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

export default AdminExchangeRequests;
