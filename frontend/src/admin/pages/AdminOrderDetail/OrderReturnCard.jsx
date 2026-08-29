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
      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl animate-pulse">
        <div className="h-6 bg-[var(--admin-border)] rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-[var(--admin-border)] rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-[var(--admin-border)] rounded w-1/3"></div>
      </div>
    );
  }

  const { returns = [], exchanges = [] } = returnSummary || {};

  if (returns.length === 0 && exchanges.length === 0) {
    return null;
  }

  return (
    <div className="p-0 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-xl overflow-hidden border-l-4 border-l-[var(--admin-warning)]">
      <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex items-center justify-between">
        <div>
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-2 mb-1 block">
            <span className="material-symbols-outlined text-[16px] text-[var(--admin-warning)]">
              keyboard_return
            </span>
            Returns & Exchanges
          </label>
          <p className="text-[11px] text-[var(--admin-text-tertiary)]">
            Active reverse logistics for this order
          </p>
        </div>
      </div>

      <div className="divide-y divide-[var(--admin-border)]">
        {returns.map((ret, index) => (
          <div
            key={ret._id}
            className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-[var(--admin-background)] transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
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
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--admin-border)] text-[var(--admin-text-secondary)]">
                  {ret.returnType.toUpperCase()}
                </span>
              </div>
              <p className="text-[12px] text-[var(--admin-text-secondary)]">
                {ret.items.length} item(s) • Refund: ₹{ret.refundBreakdown?.grandTotal || 0}
              </p>
              {ret.pickup?.status && (
                <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                  Pickup: {ret.pickup.status.replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>

            <Link
              to={`/admin/returns/requests/${ret._id}`}
              className="admin-btn admin-btn-outline shrink-0 w-full sm:w-auto justify-center text-[12px] py-1.5 px-3"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
