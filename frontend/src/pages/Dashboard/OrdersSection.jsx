import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { OrderDetail } from '../../components/dashboard/OrderDetail';
import { OrdersListSkeleton, FilterTabs } from '../../components/ui';

export function OrdersSection() {
  const { selectedOrderId, isOrdersLoading, orderItems, orderFilter, setOrderFilter } =
    useDashboard();

  useEffect(() => {
    // Default to Purchase orders when accessing the orders route
    setOrderFilter('PURCHASE');
  }, [setOrderFilter]);

  return (
    <motion.div
      id="panel-orders"
      role="tabpanel"
      key="tab-orders"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-[11px]"
    >
      {selectedOrderId === null ? (
        /* MAIN LIST VIEW */
        <>
          <FilterTabs
            value={orderFilter}
            onChange={setOrderFilter}
            options={[
              { id: 'PURCHASE', label: 'Purchase Orders' },
              { id: 'RENTAL', label: 'Rental Orders' },
            ]}
          />

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
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[40vh]">
              <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>

              <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface mb-2">
                No Orders Found
              </h3>
              <p className="text-secondary text-[9px] font-bold uppercase tracking-widest max-w-[250px] mb-6">
                {orderFilter === 'PURCHASE'
                  ? 'Explore our collections and discover beautiful decor pieces.'
                  : orderFilter === 'RENTAL'
                    ? 'Browse our premium catalog to reserve items for your events.'
                    : 'You have no active returns or exchanges.'}
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
          )}
        </>
      ) : (
        /* DETAIL VIEW */
        <OrderDetail />
      )}
    </motion.div>
  );
}
