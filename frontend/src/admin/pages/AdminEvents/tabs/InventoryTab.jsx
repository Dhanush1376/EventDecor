import { m as motion } from 'framer-motion';
import { SkeletonCard, StatusBadge, fadeUp } from '../../../components/AdminUIKit';

export function InventoryTab({ inventoryItems, operationsLoading }) {
  return (
    <motion.div
      key="inventory"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      <div className="admin-card p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4">
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            Rental Inventory Stock Ledger
          </h3>
          <span className="admin-badge admin-badge-neutral">
            {inventoryItems.length} Props tracked
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {operationsLoading ? (
            [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          ) : inventoryItems.length > 0 ? (
            inventoryItems.map((prop, idx) => (
              <div
                key={idx}
                className="p-5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] flex flex-col justify-between h-36"
              >
                <div>
                  <StatusBadge status={prop.status} className="mb-2" />
                  <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] leading-tight line-clamp-2">
                    {prop.item}
                  </h4>
                </div>
                <div className="flex justify-between items-end border-t border-[var(--admin-border)] pt-3 text-[11px]">
                  <span className="text-[var(--admin-text-tertiary)]">
                    Stock:{' '}
                    <strong className="text-[var(--admin-text-primary)] font-bold">
                      {prop.stock}
                    </strong>
                  </span>
                  <span className="text-[var(--admin-text-tertiary)]">
                    Rented:{' '}
                    <strong className="text-[var(--admin-text-primary)] font-bold">
                      {prop.rented}
                    </strong>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-[var(--admin-text-tertiary)] text-[12px]">
              No product inventory is available yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
