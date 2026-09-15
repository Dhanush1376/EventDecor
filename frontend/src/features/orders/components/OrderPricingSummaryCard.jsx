import React from 'react';
import {
  Receipt,
  ChevronDown,
  CreditCard,
  AlertTriangle,
  Info,
  ArrowLeftRight,
  CornerDownLeft,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfig } from '../../../context/ConfigContext';

/**
 * Collapsible order pricing breakdown panel, pending payment resolver, and invoice / return action trigger bar.
 */
export default function OrderPricingSummaryCard({
  order,
  item,
  isRental,
  isPriceDetailsOpen,
  setIsPriceDetailsOpen,
  isResuming,
  setIsResuming,
  resumePayment,
  downloadInvoice,
  returnRequest,
  isReturnExchangeBlocked,
  isDelivered,
  isNonRefundable,
}) {
  const { storeName } = useConfig();

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs">
      <button
        onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors font-bold text-[9px] uppercase tracking-widest text-on-surface border-b border-outline-variant/20 text-left cursor-pointer bg-transparent"
      >
        <span className="flex items-center gap-1.5">
          <Receipt className="text-[14px]" strokeWidth={1.5} />
          Order Price Breakdown
        </span>
        <ChevronDown
          className="text-[16px] text-secondary transition-transform duration-200"
          strokeWidth={1.5}
        />
      </button>

      <AnimatePresence initial={false}>
        {isPriceDetailsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-surface-container-lowest"
          >
            <div className="p-5 space-y-3 border-b border-outline-variant/20 text-[11px] text-on-surface">
              {!isRental ? (
                <div className="flex justify-between">
                  <span className="text-secondary">Items Subtotal</span>
                  <span className="font-semibold">
                    ₹
                    {(
                      order.total -
                      (order.shippingFee || 0) +
                      (order.discount || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-secondary">Rental Charge</span>
                    <span className="font-semibold">
                      ₹
                      {(
                        order.total -
                        (order.shippingFee || 0) +
                        (order.discount || 0) -
                        (item?.securityDeposit || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  {(Number(item?.securityDeposit || 0) > 0 ||
                    Number(order.securityDeposit || 0) > 0) && (
                    <div className="flex justify-between items-center">
                      <span className="text-secondary flex items-center gap-1.5">
                        Refundable Security Deposit
                        <span
                          className={`text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded border leading-none ${
                            order.depositStatus === 'refunded'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {order.depositStatus === 'refunded' ? 'Refunded' : 'Held'}
                        </span>
                      </span>
                      <span className="font-semibold font-mono">
                        ₹{(item?.securityDeposit || order.securityDeposit || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-secondary">Delivery & Shipping Fee</span>
                <span>{order.shippingFee ? `₹${order.shippingFee}` : 'FREE'}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Premium Coupon Discount</span>
                  <span className="font-semibold">-₹{order.discount.toLocaleString()}</span>
                </div>
              )}
              {order.codFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">COD Transaction Fees</span>
                  <span>₹{order.codFee}</span>
                </div>
              )}
              <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-sm text-primary">
                <span>Amount Paid</span>
                <span>₹{(order.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low/50 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-outline-variant/20">
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <CreditCard className="text-[14px]" strokeWidth={1.5} />
                Payment: {order.paymentMethod?.toUpperCase() || 'RAZORPAY'}
              </span>
              <span className="text-[8px] text-secondary uppercase tracking-widest">
                Sold by: {storeName}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Payment Banner for Pending Orders */}
      {order.paymentStatus === 'pending' && order.paymentMethod === 'razorpay' && (
        <div className="bg-amber-50/50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-amber-200/50">
          <span className="text-[9px] uppercase tracking-widest text-amber-800 font-bold flex items-center gap-1.5">
            <AlertTriangle className="text-[14px]" strokeWidth={1.5} />
            Payment Pending
          </span>
          <button
            disabled={isResuming}
            onClick={() => {
              setIsResuming(true);
              resumePayment(
                order,
                () => {
                  toast.success('Payment completed successfully. Refreshing...');
                  window.location.reload();
                },
                () => setIsResuming(false),
              );
            }}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 border-0 disabled:opacity-50 cursor-pointer"
          >
            {isResuming ? 'Processing...' : 'Complete Payment'}
          </button>
        </div>
      )}

      {/* Actions (Return / Exchange & Download Invoice) */}
      <div className="p-5 bg-surface-container-lowest flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-[9px] uppercase tracking-widest text-secondary font-medium flex items-center gap-1.5">
          <Info className="text-[14px]" strokeWidth={1.5} />
          Need official copies or assistance?
        </span>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {!isRental && (
            <>
              {returnRequest ? (
                <button
                  onClick={() => {
                    document
                      .getElementById('journey-tracker')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#2A2927] hover:bg-black text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer border-0"
                >
                  {returnRequest.returnType === 'exchange' ? (
                    <>
                      <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
                      View Live Exchange Journey
                    </>
                  ) : (
                    <>
                      <CornerDownLeft className="text-[14px]" strokeWidth={1.5} />
                      View Live Return Journey
                    </>
                  )}
                </button>
              ) : (
                <>
                  {isReturnExchangeBlocked ? (
                    <button
                      disabled
                      title={
                        !isDelivered
                          ? 'Returns available after order delivery'
                          : isNonRefundable
                            ? 'Item is non-returnable'
                            : 'Return window closed'
                      }
                      className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap opacity-50 cursor-not-allowed"
                    >
                      <CornerDownLeft className="text-[14px]" strokeWidth={1.5} />
                      Return Items
                    </button>
                  ) : (
                    <Link
                      to={`/dashboard/returns/new?orderId=${order._id || order.id}`}
                      className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <CornerDownLeft className="text-[14px]" strokeWidth={1.5} />
                      Return Items
                    </Link>
                  )}

                  {isReturnExchangeBlocked ? (
                    <button
                      disabled
                      title={
                        !isDelivered
                          ? 'Exchanges available after order delivery'
                          : isNonRefundable
                            ? 'Item is non-exchangeable'
                            : 'Exchange window closed'
                      }
                      className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap opacity-50 cursor-not-allowed"
                    >
                      <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
                      Exchange Items
                    </button>
                  ) : (
                    <Link
                      to={`/dashboard/returns/exchanges/new?orderId=${order._id || order.id}`}
                      className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
                      Exchange Items
                    </Link>
                  )}
                </>
              )}
            </>
          )}
          <button
            onClick={() => downloadInvoice(order._id)}
            className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap border-0 cursor-pointer"
          >
            <Download className="text-[14px]" strokeWidth={1.5} />
            View Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
