import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp, formatCurrency } from '../../components/AdminUIKit';
import { playSuccessBeep, playErrorBeep } from '../../../utils/media/audioUtils';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';

export function OrderSettlement({
  order,
  updateOrderStatus,
  settlementCharges,
  setSettlementCharges,
}) {
  if (order.rawOrder?.paymentMethod?.toLowerCase() !== 'cod') {
    return null;
  }

  const handleReconcileCOD = async () => {
    try {
      await updateOrderStatus(
        order.id,
        'Settled',
        `COD Remittance Reconciled. Courier Charges: ₹${settlementCharges}`,
        Number(settlementCharges),
      );
      playSuccessBeep();
      toast.success('Payment settled');
    } catch (error) {
      playErrorBeep();
      toast.error(getErrorMessage(error, 'Failed to reconcile COD remittance.'));
    }
  };

  return (
    <motion.div variants={fadeUp} className="admin-card p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--admin-warning)]"></div>

      <div className="flex items-center justify-between mb-4 border-b border-[var(--admin-border-subtle)] pb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[var(--admin-warning)]">
            account_balance_wallet
          </span>
          <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            COD Reconciliation & Settlement
          </h2>
        </div>
        <span
          className={`admin-badge border-none font-bold text-[10px] uppercase tracking-wider h-6 px-2.5 ${
            order.rawOrder?.settlementStatus === 'Settled'
              ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
              : 'bg-[#fffbeb] text-[#d97706]'
          }`}
        >
          {order.rawOrder?.settlementStatus || 'Pending'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-[var(--admin-surface-muted)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
          <span className="block text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mb-1">
            Total COD Volume
          </span>
          <span className="text-[16px] font-bold text-[var(--admin-text-primary)]">
            {formatCurrency(order.total)}
          </span>
        </div>
        <div className="bg-[var(--admin-surface-muted)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
          <span className="block text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mb-1">
            Courier Deductions
          </span>
          <span className="text-[16px] font-bold text-[var(--admin-warning)]">
            {formatCurrency(order.rawOrder?.courierCharges || settlementCharges)}
          </span>
        </div>
        <div className="bg-[var(--admin-surface-muted)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
          <span className="block text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mb-1">
            Bank Payout Amount
          </span>
          <span className="text-[16px] font-bold text-[var(--admin-success)]">
            {order.rawOrder?.settlementStatus === 'Settled'
              ? formatCurrency(
                  order.rawOrder?.settledAmount ||
                    order.total - (order.rawOrder?.courierCharges || 150),
                )
              : formatCurrency(order.total - settlementCharges)}
          </span>
        </div>
      </div>

      {order.rawOrder?.settlementStatus !== 'Settled' ? (
        <div className="bg-[#fffbeb] p-5 rounded-[var(--admin-radius-lg)] border border-[#fde68a] space-y-4">
          <p className="text-[12px] text-[#92400e] leading-relaxed font-medium">
            This order is marked as <strong>{order.payment}</strong>. The courier partner (
            {order.courierPartner || 'Standard Courier'}) has collected the cash. Adjust and enter
            the actual shipping + COD handling fees below to reconcile the remittance to our bank.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:w-1/2 text-left">
              <label className="admin-label text-[#92400e]">Adjust Courier Fee (₹)</label>
              <input
                type="number"
                value={settlementCharges}
                onChange={(e) => setSettlementCharges(Math.max(0, Number(e.target.value)))}
                className="admin-input bg-[var(--admin-surface)] border-[#fcd34d] focus:border-[#d97706] focus:ring-[#fcd34d]"
              />
            </div>
            <button
              onClick={handleReconcileCOD}
              disabled={order.status !== 'Delivered'}
              className={`admin-btn h-10 px-6 border-none ${
                order.status === 'Delivered'
                  ? 'bg-[#d97706] text-white hover:bg-[#b45309]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Reconcile & Settle COD
            </button>
          </div>
          {order.status !== 'Delivered' && (
            <p className="text-[11px] font-bold text-[var(--admin-error)]">
              * Reconciliation can only be executed once status is updated to "Delivered" via agent
              scan or manual override.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-[var(--admin-success-light)] p-5 rounded-[var(--admin-radius-lg)] border border-[#bbf7d0] flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-[var(--admin-success)] mt-0.5">
            check_circle
          </span>
          <div className="space-y-1.5">
            <p className="text-[13px] font-bold text-[#166534]">Remittance Fully Settled</p>
            <p className="text-[12px] text-[#15803d] leading-relaxed font-medium">
              Reconciled! Net payout of{' '}
              <strong>
                {formatCurrency(
                  order.rawOrder?.settledAmount || order.total - order.rawOrder?.courierCharges,
                )}
              </strong>{' '}
              was received in the studio's bank account after deducting courier fees of{' '}
              <strong>{formatCurrency(order.rawOrder?.courierCharges)}</strong>.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
