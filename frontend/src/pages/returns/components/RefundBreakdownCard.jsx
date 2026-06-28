import React from 'react';

const RefundBreakdownCard = ({ breakdown, method, status = 'pending', estimatedDate }) => {
  if (!breakdown) return null;

  const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: 'schedule', color: 'text-warning', bg: 'bg-warning/10' },
    processing: { label: 'Processing', icon: 'sync', color: 'text-info', bg: 'bg-info/10' },
    completed: {
      label: 'Completed',
      icon: 'check_circle',
      color: 'text-success',
      bg: 'bg-success/10',
    },
    failed: { label: 'Failed', icon: 'error', color: 'text-error', bg: 'bg-error/10' },
  };

  const currentStatus = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const METHOD_LABELS = {
    original: 'Original Payment Method',
    wallet: 'Store Wallet',
    store_credit: 'Store Credit',
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/40 overflow-hidden">
      <div className="p-5 flex items-center justify-between border-b border-outline-variant/20 bg-surface-variant/30">
        <div>
          <h3 className="font-semibold text-on-surface">Refund Details</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Method:{' '}
            <span className="font-medium text-on-surface">{METHOD_LABELS[method] || method}</span>
          </p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${currentStatus.bg} ${currentStatus.color}`}
        >
          <span className="material-symbols-outlined text-[16px]">{currentStatus.icon}</span>
          <span className="text-sm font-medium">{currentStatus.label}</span>
        </div>
      </div>

      <div className="p-5 space-y-3 text-sm">
        <div className="flex justify-between items-center text-on-surface-variant">
          <span>Product Total</span>
          <span className="font-medium text-on-surface">₹{breakdown.productTotal?.toFixed(2)}</span>
        </div>

        {breakdown.taxRefund > 0 && (
          <div className="flex justify-between items-center text-on-surface-variant">
            <span>Tax Refund</span>
            <span className="font-medium text-on-surface">₹{breakdown.taxRefund?.toFixed(2)}</span>
          </div>
        )}

        {breakdown.shippingRefund > 0 && (
          <div className="flex justify-between items-center text-on-surface-variant">
            <span>Shipping Refund</span>
            <span className="font-medium text-on-surface">
              ₹{breakdown.shippingRefund?.toFixed(2)}
            </span>
          </div>
        )}

        {breakdown.discountDeduction > 0 && (
          <div className="flex justify-between items-center text-error">
            <span>Discount Deduction</span>
            <span className="font-medium">-₹{breakdown.discountDeduction?.toFixed(2)}</span>
          </div>
        )}

        {breakdown.couponDeduction > 0 && (
          <div className="flex justify-between items-center text-error">
            <span>Coupon Deduction</span>
            <span className="font-medium">-₹{breakdown.couponDeduction?.toFixed(2)}</span>
          </div>
        )}

        {breakdown.restockingFee > 0 && (
          <div className="flex justify-between items-center text-error">
            <span>Restocking Fee</span>
            <span className="font-medium">-₹{breakdown.restockingFee?.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-outline-variant/30 flex justify-between items-end mt-2">
          <div>
            <span className="text-on-surface font-semibold text-lg">Total Refund</span>
            {estimatedDate && status !== 'completed' && (
              <p className="text-xs text-on-surface-variant mt-0.5">
                Expected by: {new Date(estimatedDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <span className="text-2xl font-bold text-primary">
            ₹{breakdown.grandTotal?.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RefundBreakdownCard;
