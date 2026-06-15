import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { StatCards } from '../../components/dashboard/StatCards';
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
          {/* Metric Summary Cards */}
          <StatCards />

          {/* Filter Pill Tab Bar */}
          <div className="flex justify-center mb-6 w-full px-2 sm:px-0">
            <div className="flex w-full max-w-sm gap-1 p-1.5 items-center bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-lg shadow-inner">
              {[
                { id: 'PURCHASE', label: 'Purchase Orders' },
                { id: 'RENTAL', label: 'Rental Orders' },
              ].map((f) => {
                const isActive = orderFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setOrderFilter(f.id)}
                    className={`relative flex-1 h-9 lg:h-8 flex items-center justify-center rounded-lg font-label text-[10px] sm:text-[11px] uppercase tracking-[0.12em] transition-colors duration-300 whitespace-nowrap z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border-0 ${
                      isActive
                        ? 'text-primary font-bold bg-transparent'
                        : 'text-on-surface-variant/70 hover:text-on-surface font-medium bg-transparent'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeOrderFilterTab"
                        className="absolute inset-0 bg-surface-bright rounded-lg shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{f.label}</span>
                  </button>
                );
              })}
            </div>
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
            <div className="text-center max-w-2xl mx-auto py-16 md:py-24 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 mx-auto relative">
                <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl" />
                <span className="material-symbols-outlined text-primary text-[30px] relative z-10">
                  receipt_long
                </span>
              </div>

              <h2 className="font-display text-[22px] text-on-surface tracking-tight mb-2">
                No Orders Found
              </h2>
              <p className="font-body text-[13px] text-secondary/60 font-light max-w-[220px] mx-auto leading-relaxed mb-8">
                {orderFilter === 'PURCHASE'
                  ? 'Explore our collections and discover beautiful decor pieces.'
                  : 'Browse our premium catalog to reserve items for your events.'}
              </p>

              <div className="flex justify-center">
                <Link
                  to="/collections"
                  className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
                >
                  <span>Explore Collection</span>
                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
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
