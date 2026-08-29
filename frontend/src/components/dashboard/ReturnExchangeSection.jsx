import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, ArrowLeftRight, ChevronDown, ArrowRight, ArrowDown } from 'lucide-react';
import { returnService } from '../../services/api/returnService';

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
  const [returns, setReturns] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openSection, setOpenSection] = useState(null); // 'returns' or 'exchanges'

  useEffect(() => {
    if (!orderId) return;
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        const [returnsRes, exchangesRes] = await Promise.all([
          returnService.getMyReturns(),
          returnService.getMyExchanges(),
        ]);

        if (returnsRes.data?.success) {
          const allReturns = returnsRes.data.data.returns || returnsRes.data.data || [];
          const matchedReturns = allReturns.filter(
            (r) =>
              (typeof r.orderId === 'object' ? r.orderId._id || r.orderId.id : r.orderId) ===
                orderId && r.returnType !== 'exchange',
          );
          setReturns(matchedReturns);

          if (exchangesRes.data?.success) {
            const allExchanges = exchangesRes.data.data.exchanges || exchangesRes.data.data || [];
            const validExchanges = allExchanges;
            const finalExchanges = validExchanges.filter((e) => {
              const retId =
                typeof e.returnRequestId === 'object' ? e.returnRequestId.orderId : null;
              if (retId === orderId) return true;
              const correspondingReturn = allReturns.find((r) => r._id === e.returnRequestId);
              return (
                correspondingReturn &&
                (typeof correspondingReturn.orderId === 'object'
                  ? correspondingReturn.orderId._id || correspondingReturn.orderId.id
                  : correspondingReturn.orderId) === orderId
              );
            });
            setExchanges(finalExchanges);

            // Auto-open if there are requests
            if (finalExchanges.length > 0) {
              setOpenSection('exchanges');
            } else if (matchedReturns.length > 0) {
              setOpenSection('returns');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load return/exchange details', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [orderId]);

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
                  {returns.map((r) => (
                    <div
                      key={r._id}
                      className="border border-outline-variant/30 rounded-lg p-4 bg-surface-bright"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[10px] font-bold text-on-surface uppercase tracking-wider mb-1">
                            Return {r.returnId}
                          </div>
                          <div className="text-[10px] text-secondary">
                            Status:{' '}
                            <span className="font-bold text-amber-600">
                              {r.status?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-on-surface mb-3 flex gap-2 overflow-x-auto pb-2">
                        {r.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex gap-2 items-center border border-outline-variant/20 rounded p-2 min-w-[150px]"
                          >
                            <img
                              src={item.imageSrc || 'https://via.placeholder.com/40'}
                              alt={item.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div>
                              <div
                                className="font-bold truncate text-[11px] mb-0.5"
                                title={item.title}
                              >
                                {item.title}
                              </div>
                              <div className="text-secondary">Qty: {item.returnQuantity}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {r.refundBreakdown?.grandTotal > 0 && (
                        <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-[10px]">
                          <span className="text-secondary">
                            Refund Amount:{' '}
                            <strong className="text-on-surface">
                              ₹{Math.round(r.refundBreakdown.grandTotal).toLocaleString('en-IN')}
                            </strong>
                          </span>
                          <span className="text-secondary">
                            Method:{' '}
                            <strong className="text-on-surface">
                              {r.refundMethod === 'wallet' ? 'Wallet' : 'Original Payment'}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
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
                  {exchanges.map((e) => (
                    <div
                      key={e._id}
                      className="border border-outline-variant/30 rounded-lg p-4 bg-surface-bright"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[10px] font-bold text-on-surface uppercase tracking-wider mb-1">
                            Exchange {e.exchangeId}
                          </div>
                          <div className="text-[10px] text-secondary">
                            Replacement Status:{' '}
                            <span className="font-bold text-blue-600">
                              {formatReplacementStatus(e.replacementStatus).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-on-surface mb-5 mt-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-0 relative">
                        {/* Returning Item */}
                        <div className="flex gap-3 items-center border border-outline-variant/30 rounded-lg p-3 w-full sm:flex-1 bg-surface-bright shadow-sm relative z-0">
                          <div className="relative shrink-0">
                            <img
                              src={e.originalItem.imageSrc || 'https://via.placeholder.com/40'}
                              alt={e.originalItem.title}
                              className="w-12 h-12 object-cover rounded-md border border-outline-variant/20"
                            />
                            <div className="absolute -top-2 -right-2 bg-red-100 text-red-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm">
                              Return
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-bold text-on-surface truncate text-[12px] mb-0.5"
                              title={e.originalItem.title}
                            >
                              {e.originalItem.title}
                            </div>
                            <div className="text-secondary text-[9px] uppercase tracking-wider font-semibold">
                              Returning
                            </div>
                          </div>
                        </div>

                        {/* Separator / Arrow */}
                        <div className="flex items-center justify-center bg-white rounded-full w-8 h-8 shrink-0 border-[1.5px] border-blue-200 text-blue-500 z-10 -my-4 sm:my-0 sm:-mx-4 shadow-sm relative">
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
                        <div className="flex gap-3 items-center border border-blue-200/60 rounded-lg p-3 w-full sm:flex-1 bg-blue-50/40 shadow-sm relative z-0">
                          <div className="relative shrink-0">
                            <img
                              src={e.replacementItem.imageSrc || 'https://via.placeholder.com/40'}
                              alt={e.replacementItem.title}
                              className="w-12 h-12 object-cover rounded-md border border-blue-200/50"
                            />
                            <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm">
                              New
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-bold text-blue-950 truncate text-[12px] mb-0.5"
                              title={e.replacementItem.title}
                            >
                              {e.replacementItem.title}
                            </div>
                            <div className="text-blue-700 text-[9px] uppercase tracking-wider font-semibold">
                              Receiving
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-[10px]">
                        <span className="text-secondary">
                          {e.trackingNumber ? (
                            <>
                              Courier:{' '}
                              <strong className="text-on-surface">
                                {e.courierPartner || 'Assigned'}
                              </strong>
                              {' | '}
                              Tracking:{' '}
                              <strong className="text-on-surface">{e.trackingNumber}</strong>
                            </>
                          ) : (
                            <span>Tracking will appear once shipped.</span>
                          )}
                        </span>
                        <span className="text-secondary flex items-center gap-2">
                          Payment Diff:{' '}
                          <strong className="text-on-surface">
                            ₹{Math.round(e.priceDifference || 0).toLocaleString('en-IN')} (
                            {formatPaymentStatus(e.paymentStatus)})
                          </strong>
                          {e.paymentStatus === 'payment_required' && e.additionalPaymentId && (
                            <button
                              onClick={async () => {
                                const loadRazorpay = () =>
                                  new Promise((resolve) => {
                                    const script = document.createElement('script');
                                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                                    script.onload = () => resolve(true);
                                    script.onerror = () => resolve(false);
                                    document.body.appendChild(script);
                                  });
                                const isLoaded = await loadRazorpay();
                                if (!isLoaded) return alert('Failed to load payment gateway');
                                const options = {
                                  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                                  amount: Math.round(e.priceDifference * 100),
                                  currency: 'INR',
                                  name: 'Event Decor',
                                  description: 'Exchange Price Difference',
                                  order_id: e.additionalPaymentId,
                                  handler: async function (response) {
                                    try {
                                      await returnService.verifyExchangePayment({
                                        razorpayOrderId: response.razorpay_order_id,
                                        razorpayPaymentId: response.razorpay_payment_id,
                                        razorpaySignature: response.razorpay_signature,
                                      });
                                      window.location.reload();
                                    } catch (err) {
                                      alert('Payment verification failed');
                                    }
                                  },
                                  theme: { color: '#2A2927' },
                                };
                                const rzp = new window.Razorpay(options);
                                rzp.open();
                              }}
                              className="bg-[#2A2927] text-white px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-black transition-colors ml-2 cursor-pointer"
                            >
                              Pay Now
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
