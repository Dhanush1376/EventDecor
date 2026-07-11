import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { OrderDetail } from '../../components/dashboard/OrderDetail';
import { OrdersListSkeleton } from '../../components/ui';

export function RentalsSection() {
  const { selectedOrderId, isOrdersLoading, orderItems, orderFilter, setOrderFilter } =
    useDashboard();

  useEffect(() => {
    // Default to Rental orders when accessing the rentals route
    setOrderFilter('RENTAL');
  }, [setOrderFilter]);

  return (
    <motion.div
      id="panel-rentals"
      role="tabpanel"
      key="tab-rentals"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-[11px]"
    >
      {selectedOrderId === null ? (
        /* MAIN LIST VIEW */
        <>
          <div className="pb-4 mb-4 border-b border-outline-variant/20">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px]">inventory_2</span>
              My Rentals
            </h2>
          </div>

          {/* Order Cards */}
          {isOrdersLoading ? (
            <OrdersListSkeleton rows={2} />
          ) : (
            <motion.div layout className="space-y-4">
              <AnimatePresence>
                {orderItems.map(({ order, item, itemIdx }, idx) => (
                  <OrderCard
                    key={`${order._id || idx}-${itemIdx}`}
                    order={order}
                    item={item}
                    itemIdx={itemIdx}
                    idx={idx}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {orderItems.length === 0 && !isOrdersLoading && (
            <div className="bg-surface-bright rounded-lg p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[35vh] relative overflow-hidden border border-black/5">
              {/* Decorative background blur */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#8c7335]/5 rounded-full blur-3xl pointer-events-none" />

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-16 h-16 rounded-full bg-[#8c7335]/5 text-[#8c7335] flex items-center justify-center mb-5 relative"
              >
                <div
                  className="absolute inset-0 rounded-full border border-[#8c7335]/20 animate-ping"
                  style={{ animationDuration: '3s' }}
                />
                <span className="material-symbols-outlined text-[24px] relative z-10">
                  inventory_2
                </span>
              </motion.div>

              <h3 className="font-display font-medium text-[18px] lg:text-[20px] text-black mb-2">
                No Rentals Found
              </h3>
              <p className="text-[11px] text-black/40 max-w-[280px] mb-6 leading-normal">
                You don't have any active rentals. Browse our catalog to reserve items.
              </p>

              <div className="flex justify-center mt-6">
                <Link
                  to="/collections"
                  className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70"
                >
                  Explore Rentals
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          )}
        </>
      ) : (
        /* DETAIL VIEW */
        <OrderDetail />
      )}
    </motion.div>
  );
}
