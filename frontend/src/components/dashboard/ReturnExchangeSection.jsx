import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerDownLeft, ArrowLeftRight, ChevronDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { returnService } from '../../services/api/returnService';

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
            const validExchanges = allExchanges.filter((e) => e.paymentStatus !== 'pending');
            setExchanges(
              validExchanges.filter((e) => {
                const retId =
                  typeof e.returnRequestId === 'object' ? e.returnRequestId.orderId : null;
                // If populated:
                if (retId === orderId) return true;
                // If not populated, rely on the matched returns
                // Wait, matchedReturns has returnType !== 'exchange' now!
                // So we need to look in allReturns instead.
                const correspondingReturn = allReturns.find((r) => r._id === e.returnRequestId);
                return (
                  correspondingReturn &&
                  (typeof correspondingReturn.orderId === 'object'
                    ? correspondingReturn.orderId._id || correspondingReturn.orderId.id
                    : correspondingReturn.orderId) === orderId
                );
              }),
            );
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
                        <Link
                          to={`/dashboard/returns/${r._id}`}
                          className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                        >
                          Track Return <ArrowRight className="text-[10px]" />
                        </Link>
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
                              <div className="font-bold truncate max-w-[100px]">{item.title}</div>
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
                              ₹{r.refundBreakdown.grandTotal}
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
                              {e.replacementStatus?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-on-surface mb-3 flex items-center gap-3">
                        <div className="flex gap-2 items-center border border-outline-variant/20 rounded p-2 flex-1">
                          <img
                            src={e.originalItem.imageSrc || 'https://via.placeholder.com/40'}
                            alt={e.originalItem.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div>
                            <div className="font-bold truncate max-w-[120px]">
                              {e.originalItem.title}
                            </div>
                            <div className="text-secondary text-[9px] uppercase">Returning</div>
                          </div>
                        </div>

                        <ArrowRight className="text-secondary shrink-0" size={16} />

                        <div className="flex gap-2 items-center border border-blue-200 rounded p-2 flex-1 bg-blue-50/30">
                          <img
                            src={e.replacementItem.imageSrc || 'https://via.placeholder.com/40'}
                            alt={e.replacementItem.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div>
                            <div className="font-bold text-blue-900 truncate max-w-[120px]">
                              {e.replacementItem.title}
                            </div>
                            <div className="text-blue-700 text-[9px] uppercase">Receiving</div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-[10px]">
                        <span className="text-secondary">
                          Tracking:{' '}
                          <strong className="text-on-surface">
                            {e.trackingNumber || 'Pending'}
                          </strong>
                        </span>
                        <span className="text-secondary">
                          Payment Diff:{' '}
                          <strong className="text-on-surface">
                            ₹{e.priceDifference} ({e.paymentStatus})
                          </strong>
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
