import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { returnService } from '../../services/api/returnService';
import { OptimizedImage, OrdersListSkeleton } from '../../components/ui';
import { useDashboard } from '../../context/DashboardContext';
import { useNavigate } from 'react-router-dom';
import { useUserSocket } from '../../context/UserSocketProvider';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export const MyReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedOrderId, setSelectedOrderItemIndex, orders } = useDashboard();
  const navigate = useNavigate();
  const socket = useUserSocket();

  const handleTrackJourney = (ret) => {
    navigate(`/dashboard/returns/${ret._id}`);
  };

  const fetchReturns = async () => {
    try {
      const res = await returnService.getMyReturns();
      if (res.data.success) {
        setReturns(res.data.data.returns || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load returns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchReturns();
    };

    socket.on('return:status_updated', handleUpdate);
    socket.on('return:created', handleUpdate);

    return () => {
      socket.off('return:status_updated', handleUpdate);
      socket.off('return:created', handleUpdate);
    };
  }, [socket]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-amber-100 text-amber-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left max-w-4xl">
        <div className="flex flex-col mb-6 pb-4 border-b border-outline-variant/30">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">assignment_return</span>
            My Returns & Exchanges
          </h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-secondary mt-1.5 ml-6">
            Track the status of your reverse logistics
          </p>
        </div>
        <OrdersListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="space-y-6 text-left max-w-4xl"
    >
      <div className="flex flex-col gap-2.5 mb-6 pb-5 border-b border-black/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border-[1.5px] border-black flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] text-black">
              assignment_return
            </span>
          </div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.15em] text-on-surface">
            My Returns & Exchanges
          </h2>
        </div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-secondary ml-8">
          Track the status of your reverse logistics
        </p>
      </div>

      {!returns || returns.length === 0 ? (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[40vh]">
          <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          </div>
          <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface mb-2">
            No Returns Yet
          </h3>
          <p className="text-secondary text-[9px] font-bold uppercase tracking-widest max-w-[250px]">
            You haven't requested any returns or exchanges.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((ret) => (
            <div
              key={ret._id}
              className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs hover:shadow-sm transition-shadow"
            >
              <div className="bg-surface-container-lowest px-5 py-3 border-b border-outline-variant/20 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2 text-secondary">
                  <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                  <span>Return ID:</span>
                  <span className="font-mono text-on-surface">{ret.returnId}</span>
                </div>
                <div>
                  <span
                    className={`px-2.5 py-1 rounded-[4px] text-[8px] font-bold uppercase tracking-wider ${getStatusColor(ret.status)}`}
                  >
                    {ret.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="p-5 flex flex-col md:flex-row gap-5 justify-between">
                <div className="flex-1 space-y-4">
                  {ret.items.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 border border-outline-variant/30">
                        <OptimizedImage
                          src={item.imageSrc || item.productId?.imageSrc || '/placeholder.png'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h4 className="font-bold text-[10px] uppercase tracking-widest text-on-surface line-clamp-1">
                          {item.title || item.productId?.title || 'Product'}
                        </h4>
                        <div className="text-[9px] text-secondary mt-1 font-bold tracking-widest uppercase flex gap-3">
                          <span>Qty: {item.returnQuantity}</span>
                          <span className="opacity-50">|</span>
                          <span>{item.reason}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="shrink-0 md:w-48 space-y-3 border-t md:border-t-0 md:border-l border-outline-variant/20 pt-4 md:pt-0 md:pl-5 flex flex-col justify-center">
                  <div>
                    <div className="text-[8px] uppercase tracking-widest text-secondary font-bold mb-1">
                      Refund Amount
                    </div>
                    <div className="font-bold text-lg text-primary tracking-tight">
                      ₹{(ret.refundBreakdown?.grandTotal || 0).toLocaleString()}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-secondary mt-0.5">
                      Via {ret.refundMethod}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTrackJourney(ret)}
                    className="w-full py-2.5 bg-black hover:bg-gray-900 text-white border-0 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span className="material-symbols-outlined text-[12px]">local_shipping</span>
                    Track Journey
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
