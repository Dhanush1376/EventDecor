import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { StatCards } from '../../components/dashboard/StatCards';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { OrderDetail } from '../../components/dashboard/OrderDetail';
import { OrdersListSkeleton, FilterTabs } from '../../components/ui';

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
          {/* Metric Summary Cards */}
          <StatCards />

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
                  : 'Browse our premium catalog to reserve items for your events.'}
              </p>

              <div className="flex justify-center">
                <Link
                  to="/collections"
                  className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white border-0 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  Explore Collection
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
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
