import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { returnService } from '../../services/api/returnService';
import { OptimizedImage, OrdersListSkeleton, StatusPill, FilterTabs } from '../../components/ui';
import { useDashboard } from '../../context/DashboardContext';
import { useNavigate, Link } from 'react-router-dom';
import { useUserSocket } from '../../context/UserSocketProvider';

const fadeUp = { hidden: { opacity: 0, scale: 0.98 }, show: { opacity: 1, scale: 1 } };

export const MyReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnFilter, setReturnFilter] = useState('RETURN');
  const { setSelectedOrderId, setSelectedOrderItemIndex, orders } = useDashboard();
  const navigate = useNavigate();
  const socket = useUserSocket();

  const handleTrackJourney = (ret) => {
    const targetOrderId = typeof ret.orderId === 'object' ? ret.orderId._id : ret.orderId;
    if (targetOrderId) {
      setSelectedOrderId(targetOrderId);
      navigate('/dashboard/orders');
    }
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
        return 'warning';
      case 'approved':
        return 'info';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 text-[11px]">
        <FilterTabs
          value={returnFilter}
          onChange={setReturnFilter}
          options={[
            { id: 'RETURN', label: 'Returns' },
            { id: 'EXCHANGE', label: 'Exchanges' },
          ]}
        />
        <OrdersListSkeleton rows={3} />
      </div>
    );
  }

  const filteredReturns = returns.filter((ret) =>
    returnFilter === 'RETURN' ? ret.returnType !== 'exchange' : ret.returnType === 'exchange',
  );

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4 text-[11px]">
      <FilterTabs
        value={returnFilter}
        onChange={setReturnFilter}
        options={[
          { id: 'RETURN', label: 'Returns' },
          { id: 'EXCHANGE', label: 'Exchanges' },
        ]}
      />

      {filteredReturns.length === 0 ? (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[40vh]">
          <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
            <span className="material-symbols-outlined text-[20px]">assignment_return</span>
          </div>

          <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface mb-2">
            No {returnFilter === 'RETURN' ? 'Returns' : 'Exchanges'} Found
          </h3>
          <p className="text-secondary text-[9px] font-bold uppercase tracking-widest max-w-[250px] mb-6">
            You have no active {returnFilter === 'RETURN' ? 'returns' : 'exchanges'}.
          </p>

          <div className="flex justify-center mt-6">
            <Link
              to="/collections"
              className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70"
            >
              Explore Collection
              <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence>
            {filteredReturns.map((ret, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                key={ret._id}
                className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs hover:border-outline-variant hover:shadow-xs transition-all text-left"
              >
                <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-primary shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
                      {ret.status.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-secondary font-light">
                      on{' '}
                      {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill color="neutral">ID: {ret.returnId}</StatusPill>
                    <StatusPill color={getStatusColor(ret.status)}>
                      {ret.returnType === 'exchange' ? 'Exchange' : 'Return'}
                    </StatusPill>
                  </div>
                </div>

                {ret.items.map((item, i) => {
                  const prodTitle = item.title || item.productId?.title || 'Product';
                  const prodImage = item.imageSrc || item.productId?.imageSrc || '/placeholder.png';
                  const prodPrice = item.price || item.productId?.price || 0;
                  const prodVariant = item.variant || 'Default';

                  return (
                    <div
                      key={i}
                      onClick={() => handleTrackJourney(ret)}
                      className={`p-4 flex gap-4 items-center cursor-pointer hover:bg-surface-container/10 transition-colors group ${
                        i > 0 ? 'border-t border-outline-variant/15' : ''
                      }`}
                    >
                      <OptimizedImage
                        src={prodImage}
                        alt={prodTitle}
                        containerClassName="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs"
                        className="w-full h-full object-cover"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[9px] uppercase font-bold text-primary tracking-widest block font-label">
                          Siri Atelier Collection
                        </span>
                        <h4 className="font-display font-medium text-on-surface text-[12px] truncate">
                          {prodTitle}
                        </h4>
                        <p className="text-secondary text-[10px] font-light font-body">
                          Variant:{' '}
                          <span className="font-medium text-on-surface">{prodVariant}</span> | Qty:{' '}
                          <span className="font-medium text-on-surface">{item.returnQuantity}</span>
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5 font-body">
                          <span className="text-xs font-bold text-primary">
                            ₹{(prodPrice * item.returnQuantity).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-secondary font-light">
                            {item.reason}
                          </span>
                        </div>
                      </div>

                      <svg
                        className="w-4 h-4 text-secondary group-hover:text-primary transition-colors pr-1 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  );
                })}

                <div className="px-4 py-3 bg-surface-container-low/40 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-secondary font-body">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2 sm:gap-0">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-secondary/70 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Refund Amount:{' '}
                        <span className="font-bold text-on-surface">
                          ₹{(ret.refundBreakdown?.grandTotal || 0).toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Refund Method:</span>
                      <span className="font-bold text-on-surface">
                        {ret.refundMethod || 'original'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};
