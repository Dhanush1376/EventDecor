import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CornerDownLeft,
  ArrowLeftRight,
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Truck,
} from 'lucide-react';
import { useLegacyReturnSummary } from '../../hooks/useLegacyReturnSummary';

const formatReplacementStatus = (status) => {
  switch (status) {
    case 'pending_stock':
      return 'Replacement Preparing';
    case 'reserved':
      return 'Stock Reserved';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'inspection_pending':
      return 'Quality Check Pending';
    case 'inspection_passed':
      return 'Quality Check Passed';
    default:
      return status?.replace(/_/g, ' ') || 'Unknown';
  }
};

const formatPaymentStatus = (status) => {
  switch (status) {
    case 'payment_required':
      return 'Payment Required';
    case 'payment_paid':
      return 'Paid';
    case 'failed':
      return 'Payment Failed';
    case 'not_applicable':
      return 'No Additional Payment';
    default:
      return status?.replace(/_/g, ' ') || 'Unknown';
  }
};

export function ReturnExchangeSection({ orderId }) {
  const { data, isLoading } = useLegacyReturnSummary(orderId);
  const [openSection, setOpenSection] = useState(null); // 'returns' or 'exchanges'

  const { returns, exchanges } = useMemo(() => {
    const allReturns = data?.returns || [];
    const matchedReturns = allReturns.filter((r) => r.returnType !== 'exchange');
    const finalExchanges = (data?.exchanges || []).map((e) => {
      const returnId =
        typeof e.returnRequestId === 'object' ? e.returnRequestId?._id : e.returnRequestId;
      const correspondingReturn = allReturns.find((r) => String(r._id) === String(returnId));
      return {
        ...e,
        pickup: e.pickup || correspondingReturn?.pickup,
        returnStatus: correspondingReturn?.status,
        parentReturnId: correspondingReturn?._id || correspondingReturn?.returnId,
      };
    });
    return { returns: matchedReturns, exchanges: finalExchanges };
  }, [data]);

  // Open the most relevant section once the history has loaded.
  useEffect(() => {
    if (exchanges.length > 0) setOpenSection('exchanges');
    else if (returns.length > 0) setOpenSection('returns');
  }, [exchanges.length, returns.length]);

  if (isLoading || (returns.length === 0 && exchanges.length === 0)) return null;

  return (
    <div className="space-y-4 mt-6">
      {/* RETURN SECTION */}
      {returns.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === 'returns' ? null : 'returns')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-amber-100/50 transition-colors font-bold text-[9px] uppercase tracking-widest text-amber-900 border-b border-amber-200/50 text-left cursor-pointer bg-transparent"
          >
            <span className="flex items-center gap-1.5">
              <CornerDownLeft className="text-[14px]" strokeWidth={1.5} />
              Return Requests ({returns.length})
            </span>
            <ChevronDown
              className={`text-[16px] text-amber-700 transition-transform duration-200 ${openSection === 'returns' ? 'rotate-180' : ''}`}
              strokeWidth={1.5}
            />
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'returns' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-white/50"
              >
                <div className="p-5 space-y-4">
                  {returns.map((r) => {
                    const pickupAddr = r.pickup?.address;

                    return (
                      <div
                        key={r._id}
                        className="border border-outline-variant/30 rounded-lg p-4 bg-surface-bright"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-[10px] font-bold text-on-surface uppercase tracking-wider mb-1">
                              Return #{r.returnId}
                            </div>
                            <div className="text-[10px] text-secondary">
                              Status:{' '}
                              <span className="font-bold text-amber-700">
                                {r.status?.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="text-[10px] text-on-surface mb-3 flex gap-2 overflow-x-auto pb-2">
                          {r.items.map((item) => (
                            <div
                              key={item.productId}
                              className="flex gap-2 items-center border border-outline-variant/20 rounded p-2 min-w-[160px] bg-white/70"
                            >
                              <img
                                src={item.imageSrc || 'https://via.placeholder.com/40'}
                                alt={item.title}
                                className="w-10 h-10 object-cover rounded"
                              />
                              <div className="min-w-0 flex-1">
                                <div
                                  className="font-bold truncate text-[11px] mb-0.5"
                                  title={item.title}
                                >
                                  {item.title}
                                </div>
                                <div className="text-secondary text-[9px]">
                                  Qty: {item.returnQuantity} • {item.reason}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Inline Pickup Information */}
                        <div className="mb-3 p-3 bg-amber-50/60 rounded-lg border border-amber-200/50 text-[10px]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-amber-950 uppercase tracking-wider block text-[9px]">
                                  Reverse Pickup Details
                                </span>
                                <span className="text-secondary text-[9.5px] leading-relaxed">
                                  {pickupAddr?.city || pickupAddr?.state
                                    ? `${pickupAddr.city || ''}, ${pickupAddr.state || ''} ${pickupAddr.zipCode || pickupAddr.postalCode ? `- ${pickupAddr.zipCode || pickupAddr.postalCode}` : ''} • Phone: ${pickupAddr.phone || 'Registered'}`
                                    : 'Pickup scheduled at original delivery address'}
                                </span>
                              </div>
                            </div>
                            {r.pickup?.courierPartner && (
                              <span className="text-[8.5px] bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-mono shrink-0">
                                {r.pickup.courierPartner}{' '}
                                {r.pickup.trackingNumber ? `(${r.pickup.trackingNumber})` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom action row: Refund & View Tracking Below */}
                        <div className="pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px]">
                          {r.refundBreakdown?.grandTotal > 0 ? (
                            <div className="flex gap-3 text-secondary">
                              <span>
                                Estimated Refund:{' '}
                                <strong className="text-on-surface">
                                  ₹
                                  {Math.round(r.refundBreakdown.grandTotal).toLocaleString('en-IN')}
                                </strong>
                              </span>
                              <span>
                                Method:{' '}
                                <strong className="text-on-surface">
                                  {r.refundMethod === 'wallet' ? 'Wallet' : 'Original Payment'}
                                </strong>
                              </span>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* EXCHANGE SECTION */}
      {exchanges.length > 0 && (
        <div className="bg-blue-50/50 border border-blue-200/50 rounded-lg overflow-hidden shadow-xs">
          <button
            onClick={() => setOpenSection(openSection === 'exchanges' ? null : 'exchanges')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors font-bold text-[9px] uppercase tracking-widest text-blue-900 border-b border-blue-200/50 text-left cursor-pointer bg-transparent"
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
              Exchange Requests ({exchanges.length})
            </span>
            <ChevronDown
              className={`text-[16px] text-blue-700 transition-transform duration-200 ${openSection === 'exchanges' ? 'rotate-180' : ''}`}
              strokeWidth={1.5}
            />
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'exchanges' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-white/50"
              >
                <div className="p-5 space-y-4">
                  {exchanges.map((e) => {
                    const pickupAddr = e.pickup?.address;

                    return (
                      <div
                        key={e._id}
                        className="border border-outline-variant/30 rounded-lg p-4 bg-surface-bright"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-[10px] font-bold text-on-surface uppercase tracking-wider mb-1">
                              Exchange #{e.exchangeId}
                            </div>
                            <div className="text-[10px] text-secondary">
                              Replacement Status:{' '}
                              <span className="font-bold text-blue-600">
                                {formatReplacementStatus(e.replacementStatus).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Comparison Card: Returning vs Receiving */}
                        <div className="text-[10px] text-on-surface mb-4 mt-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-0 relative">
                          {/* Returning Item */}
                          <div className="flex gap-3 items-center border border-outline-variant/30 rounded-lg p-3 w-full sm:flex-1 bg-surface-bright shadow-xs relative z-0">
                            <div className="relative shrink-0">
                              <img
                                src={e.originalItem?.imageSrc || 'https://via.placeholder.com/40'}
                                alt={e.originalItem?.title}
                                className="w-12 h-12 object-cover rounded-md border border-outline-variant/20"
                              />
                              <div className="absolute -top-2 -right-2 bg-red-100 text-red-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-2xs">
                                Return
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-bold text-on-surface truncate text-[12px] mb-0.5"
                                title={e.originalItem?.title}
                              >
                                {e.originalItem?.title}
                              </div>
                              <div className="text-secondary text-[9px] uppercase tracking-wider font-semibold">
                                Returning
                              </div>
                            </div>
                          </div>

                          {/* Separator / Arrow */}
                          <div className="flex items-center justify-center bg-white rounded-full w-8 h-8 shrink-0 border-[1.5px] border-blue-200 text-blue-500 z-10 -my-3 sm:my-0 sm:-mx-4 shadow-xs relative">
                            <ArrowRight
                              className="hidden sm:block text-[14px]"
                              size={16}
                              strokeWidth={2.5}
                            />
                            <ArrowDown
                              className="block sm:hidden text-[14px]"
                              size={16}
                              strokeWidth={2.5}
                            />
                          </div>

                          {/* Receiving Item */}
                          <div className="flex gap-3 items-center border border-blue-200/60 rounded-lg p-3 w-full sm:flex-1 bg-blue-50/40 shadow-xs relative z-0">
                            <div className="relative shrink-0">
                              <img
                                src={
                                  e.replacementItem?.imageSrc || 'https://via.placeholder.com/40'
                                }
                                alt={e.replacementItem?.title}
                                className="w-12 h-12 object-cover rounded-md border border-blue-200/50"
                              />
                              <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-2xs">
                                New
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-bold text-blue-950 truncate text-[12px] mb-0.5"
                                title={e.replacementItem?.title}
                              >
                                {e.replacementItem?.title}
                              </div>
                              <div className="text-blue-700 text-[9px] uppercase tracking-wider font-semibold">
                                Receiving
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Inline Pickup & Reverse Courier Info */}
                        <div className="mb-3 p-3 bg-blue-50/60 rounded-lg border border-blue-200/50 text-[10px]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <Truck className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-blue-950 uppercase tracking-wider block text-[9px]">
                                  Reverse Pickup Details
                                </span>
                                <span className="text-secondary text-[9.5px] leading-relaxed">
                                  {pickupAddr?.city || pickupAddr?.state
                                    ? `${pickupAddr.city || ''}, ${pickupAddr.state || ''} ${pickupAddr.zipCode || pickupAddr.postalCode ? `- ${pickupAddr.zipCode || pickupAddr.postalCode}` : ''} • Phone: ${pickupAddr.phone || 'Registered'}`
                                    : 'Pickup scheduled at original delivery address'}
                                </span>
                              </div>
                            </div>
                            {e.pickup?.courierPartner && (
                              <span className="text-[8.5px] bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900 font-mono shrink-0">
                                {e.pickup.courierPartner}{' '}
                                {e.pickup.trackingNumber ? `(${e.pickup.trackingNumber})` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delivery & Payment status */}
                        <div className="pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px]">
                          <div className="text-secondary">
                            <span>
                              Payment Diff:{' '}
                              <strong className="text-on-surface">
                                ₹{Math.round(e.priceDifference || 0).toLocaleString('en-IN')} (
                                {formatPaymentStatus(e.paymentStatus)})
                              </strong>
                            </span>
                            {e.trackingNumber && (
                              <span className="ml-3 font-mono text-[9px] text-blue-800">
                                Replacement AWB: {e.trackingNumber}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 self-start sm:self-auto"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
