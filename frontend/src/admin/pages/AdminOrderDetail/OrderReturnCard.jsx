import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/AdminUIKit';
import { useReturnManagement } from '../../hooks/useReturnManagement';

export const OrderReturnCard = ({ order }) => {
  const { getOrderReturnSummary } = useReturnManagement();
  const [returnSummary, setReturnSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (order && order.id) {
      const fetchSummary = async () => {
        const data = await getOrderReturnSummary(order.id);
        if (data) {
          setReturnSummary(data);
        }
        setLoading(false);
      };
      fetchSummary();
    }
  }, [order, getOrderReturnSummary]);

  if (loading) {
    return (
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-[var(--admin-border)] rounded w-1/4 mb-4"></div>
        <div className="h-3 bg-[var(--admin-border)] rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-[var(--admin-border)] rounded w-1/3"></div>
      </div>
    );
  }

  const { returns = [], exchanges = [] } = returnSummary || {};

  if (returns.length === 0 && exchanges.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden relative border-l-4 border-l-[var(--admin-warning)]">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-orange-50/30 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 mb-0.5">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-warning)]">
              keyboard_return
            </span>
            Returns & Exchanges
          </h3>
          <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium">
            Active reverse logistics for this order
          </p>
        </div>
      </div>

      <div className="divide-y divide-[var(--admin-border-subtle)] p-2">
        {returns.map((ret, index) => (
          <div
            key={ret._id}
            className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-[var(--admin-surface-muted)] transition-colors rounded-xl m-1"
          >
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[14px] font-bold text-[var(--admin-text-primary)] font-mono">
                  {ret.returnId}
                </span>
                <StatusBadge
                  status={ret.status}
                  type={
                    ['completed'].includes(ret.status)
                      ? 'success'
                      : ['rejected', 'cancelled'].includes(ret.status)
                        ? 'error'
                        : ['approved', 'pickup_assigned'].includes(ret.status)
                          ? 'info'
                          : 'warning'
                  }
                />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wider border border-gray-200 shadow-sm">
                  {ret.returnType}
                </span>
              </div>
              <p className="text-[13px] text-[var(--admin-text-secondary)] font-medium">
                <span className="font-bold text-[var(--admin-text-primary)]">
                  {ret.items.length}
                </span>{' '}
                item(s) • Refund:{' '}
                <span className="font-bold text-[var(--admin-text-primary)]">
                  ₹{ret.refundBreakdown?.grandTotal || 0}
                </span>
              </p>
              {ret.pickup?.status && (
                <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                  Pickup: {ret.pickup.status.replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>

            <Link
              to={`/admin/returns/requests/${ret._id}`}
              className="admin-btn admin-btn-outline shrink-0 w-full sm:w-auto justify-center h-8 px-4 text-[12px] font-bold rounded-xl border-[var(--admin-border-strong)] hover:border-[var(--admin-text-primary)] hover:text-[var(--admin-text-primary)] shadow-sm"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
