import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';

export function OrderCard({ order, item, itemIdx, idx }) {
  const { setSelectedOrderId, setSelectedOrderItemIndex, setReviewingProduct } = useDashboard();

  const prodTitle =
    item.title ||
    (typeof item.productId === 'object' ? item.productId?.title : null) ||
    'Artisanal Piece';
  const prodPrice =
    item.price || (typeof item.productId === 'object' ? item.productId?.price : 0) || 0;
  const prodImage =
    item.imageSrc ||
    (typeof item.productId === 'object'
      ? item.productId?.imageSrc || item.productId?.images?.[0]
      : null) ||
    '';
  const prodVariant = item.variant || 'Default';
  const deliveryEntry = order.statusHistory?.find((h) => h.status?.toLowerCase() === 'delivered');
  const deliveryDate = deliveryEntry
    ? new Date(deliveryEntry.timestamp)
    : new Date(order.updatedAt || order.createdAt);
  const returnExpiryDate = new Date(deliveryDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const isReturnActive = new Date() < returnExpiryDate;
  const expiryStr = returnExpiryDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs hover:border-outline-variant hover:shadow-xs transition-all text-left"
    >
      {/* Card Header */}
      <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
        <div className="flex items-center gap-2">
          {order.orderStatus?.toLowerCase() === 'delivered' ? (
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
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125a1.125 1.125 0 001.125-1.125V9.75M8.25 18.75a1.5 1.5 0 01-3 0M21 12h-5.25m0 0V5.25A2.25 2.25 0 0013.5 3h-9A2.25 2.25 0 002.25 5.25v9a2.25 2.25 0 002.25 2.25m12-4.5V9.75A2.25 2.25 0 0014.25 7.5H12"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-primary shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
            {order.orderStatus?.toLowerCase() === 'delivered'
              ? 'Delivered'
              : order.orderStatus || 'Confirmed'}
          </span>
          <span className="text-[9px] text-secondary font-light">
            on{' '}
            {new Date(order.updatedAt || order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
        <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded font-bold uppercase tracking-wider text-secondary border border-outline-variant/10">
          {order.orderType === 'rental' || item.type === 'rental' ? 'Rental' : 'Purchase'}
        </span>
      </div>

      {/* Card Body - Item Container */}
      <div
        onClick={() => {
          setSelectedOrderId(order._id || order.id);
          setSelectedOrderItemIndex(itemIdx);
        }}
        className="p-4 flex gap-4 items-center cursor-pointer hover:bg-surface-container/10 transition-colors group"
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
            Variant: <span className="font-medium text-on-surface">{prodVariant}</span> | Qty:{' '}
            <span className="font-medium text-on-surface">{item.quantity || 1}</span>
          </p>
          <div className="flex items-center gap-1.5 pt-0.5 font-body">
            <span className="text-xs font-bold text-primary">₹{prodPrice.toLocaleString()}</span>
            {item.originalPrice && (
              <span className="text-[10px] text-secondary line-through font-light">
                ₹{item.originalPrice.toLocaleString()}
              </span>
            )}
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

      {/* Return/Exchange Window Status Block */}
      {order.orderStatus?.toLowerCase() === 'delivered' && (
        <div className="px-4 py-2 bg-surface-container-low/40 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-secondary font-body">
          <div className="flex items-center gap-1.5">
            {isReturnActive ? (
              <svg
                className="w-3.5 h-3.5 text-secondary/70 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M9 16l2 2 4-4" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-secondary/70 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="10" y1="14" x2="14" y2="18" />
                <line x1="14" y1="14" x2="10" y2="18" />
              </svg>
            )}
            <span>
              {isReturnActive
                ? `Exchange/Return window active till ${expiryStr}`
                : `Return window closed on ${expiryStr}`}
            </span>
          </div>
          {isReturnActive && (
            <span className="text-[#8c7335] font-bold uppercase tracking-wider text-[8px] border border-[#8c7335]/30 px-1.5 py-0.5 rounded bg-[#8c7335]/5">
              Active
            </span>
          )}
        </div>
      )}

      {/* Quick Review Prompt */}
      {order.orderStatus?.toLowerCase() === 'delivered' && (
        <div className="px-4 py-2.5 bg-amber-50/50 border-t border-dashed border-[#8c7335]/10 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-[#8c7335] font-medium">
            <svg
              className="w-3 h-3 text-[#8c7335] fill-[#8c7335] shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span>Review item & win 50 Loyalty Coins!</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewingProduct({
                    productId: item.productId?._id || item.productId,
                    productTitle: prodTitle,
                  });
                }}
                className="text-[#8c7335] hover:text-amber-500 transition-colors p-0.5 cursor-pointer bg-transparent border-0 outline-0 flex items-center justify-center"
              >
                <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
