import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

/**
 * Status card displaying the security deposit lifecycle for rental orders.
 */
export default function RentalDepositStatusCard({ isRental, order, item }) {
  if (
    !isRental ||
    !(Number(item?.securityDeposit || 0) > 0 || Number(order?.securityDeposit || 0) > 0)
  ) {
    return null;
  }

  const depositAmount = (
    order.depositRefund?.amount ??
    (item?.securityDeposit || order.securityDeposit || 0)
  ).toLocaleString('en-IN');

  const isRefunded = order.depositStatus === 'refunded';
  const isForfeited = order.depositStatus === 'forfeited';

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className={`w-4 h-4 ${isRefunded ? 'text-emerald-600' : 'text-primary'}`}
            strokeWidth={1.5}
          />
          <h3 className="text-[9.5px] font-bold uppercase tracking-widest text-on-surface">
            Security Deposit Status
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-widest border ${
            isRefunded
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isForfeited
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isRefunded ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Deposit Refunded
            </>
          ) : isForfeited ? (
            'Deposit Forfeited'
          ) : (
            'Deposit Held (Active)'
          )}
        </span>
      </div>

      <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-on-surface">Deposit Amount:</span>
            <span className="font-mono font-bold text-[13px] text-primary">₹{depositAmount}</span>
          </div>
          <p className="text-[10px] text-secondary leading-relaxed">
            {isRefunded
              ? `Your refundable security deposit was processed on ${order.depositRefund?.date ? new Date(order.depositRefund.date).toLocaleDateString('en-IN') : 'inspection'}${order.depositRefund?.method ? ` via ${order.depositRefund.method.replace(/_/g, ' ').toUpperCase()}` : ''}.`
              : 'Your security deposit is safely held and will be returned after product return and inspection.'}
          </p>
        </div>

        {isRefunded && (
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[9.5px] uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Returned to Customer</span>
          </div>
        )}
      </div>
    </div>
  );
}
