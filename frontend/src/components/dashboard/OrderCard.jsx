import { motion } from 'framer-motion';
import { ArrowLeftRight, CornerDownLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage, StatusPill } from '../ui';
import storeSettingsService from '../../services/api/storeSettingsService';

export function OrderCard({ order, item, itemIdx, idx }) {
  const { setSelectedOrderId, setSelectedOrderItemIndex, setReviewingProduct } = useDashboard();

  const isRental =
    order.isRental === true || order.orderType === 'rental' || item.type === 'rental';

  const prodTitle =
    item.title ||
    (typeof item.productId === 'object' ? item.productId?.title : null) ||
    'Artisanal Piece';

  const formatStatus = (statusStr) => {
    if (!statusStr) return '';
    return statusStr
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const pId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
  const prodVariant = item.variant || 'Default';

  const matchingReturn = order.returns?.find(
    (r) =>
      !['cancelled', 'rejected'].includes(r.status) &&
      r.items.some((i) => i.productId === pId && (i.variant || 'Default') === prodVariant),
  );

  const matchingExchange = order.exchanges?.find(
    (e) =>
      !['cancelled', 'rejected'].includes(e.status) &&
      e.items.some((i) => i.productId === pId && (i.variant || 'Default') === prodVariant),
  );
  const prodPrice =
    item.price || (typeof item.productId === 'object' ? item.productId?.price : 0) || 0;
  const prodImage =
    (order.isCustomOrder && order.customOrderId?.productSnapshot?.imageSrc) ||
    (order.isCustomOrder && order.customOrderId?.inspirationImages?.[0]) ||
    (order.isCustomOrder && order.customOrderId?.referenceImages?.[0]) ||
    item.imageSrc ||
    (typeof item.productId === 'object'
      ? item.productId?.imageSrc || item.productId?.images?.[0]
      : null) ||
    'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785779448/siri-arts-crafts/zqqwwbsrjpb7bqcrl24l.png';
  const { data: settingsData } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: async () => {
      const data = await storeSettingsService.getPublicSettings();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsData || {};

  const deliveryEntry = order.statusHistory?.find((h) => h.status?.toLowerCase() === 'delivered');
  const deliveryDate = deliveryEntry
    ? new Date(deliveryEntry.timestamp)
    : new Date(order.updatedAt || order.createdAt);

  const windowDays =
    item.product?.returnSettings?.returnWindowDays ||
    item.product?.returnSettings?.returnWindow ||
    (typeof item.productId === 'object' && item.productId?.returnSettings?.returnWindowDays) ||
    (typeof item.productId === 'object' && item.productId?.returnSettings?.returnWindow) ||
    settings?.returnsExchanges?.returnWindowDays ||
    14;

  const returnExpiryDate = new Date(deliveryDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const isNonRefundable =
    item.isNonRefundable === true ||
    (typeof item.productId === 'object' && item.productId?.isNonRefundable === true);
  const isReturnActive = new Date() < returnExpiryDate;
  const expiryStr = returnExpiryDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const getCardStyle = () => {
    return 'bg-surface-bright border-outline-variant/30 hover:border-outline-variant';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      className={`border rounded-lg overflow-hidden shadow-2xs hover:shadow-xs transition-all text-left ${getCardStyle()}`}
    >
      {/* Card Header */}
      <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15 relative">
        {(() => {
          if (!order.statusHistory?.length) return false;
          const lastUpdate = new Date(
            order.statusHistory[order.statusHistory.length - 1].timestamp,
          ).getTime();
          let views = {};
          try {
            views = JSON.parse(localStorage.getItem('siri_order_views') || '{}');
          } catch (e) {}
          const lastViewTime = views[order._id || order.id] || 0;
          return Date.now() - lastUpdate < 24 * 60 * 60 * 1000 && lastUpdate > lastViewTime;
        })() && (
          <span className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
        )}
        <div className="flex items-center gap-2 pl-3">
          {(() => {
            if (matchingExchange)
              return <ArrowLeftRight className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />;
            if (matchingReturn)
              return <CornerDownLeft className="w-4 h-4 text-primary shrink-0" strokeWidth={2} />;
            if (order.orderStatus?.toLowerCase() === 'delivered')
              return (
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
              );
            return (
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
            );
          })()}
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
            {(() => {
              if (matchingExchange) {
                if (matchingExchange.status === 'submitted') return 'Exchange Requested';
                if (matchingExchange.status === 'completed') return 'Exchange Completed';
                return formatStatus(matchingExchange.status);
              }
              if (matchingReturn) {
                if (matchingReturn.status === 'submitted') return 'Return Requested';
                if (matchingReturn.status === 'completed') return 'Return Completed';
                return formatStatus(matchingReturn.status);
              }

              return formatStatus(order.orderStatus || order.status || 'Confirmed');
            })()}
          </span>
          <span className="text-[9px] text-secondary font-light">
            on{' '}
            {new Date(
              (matchingExchange || matchingReturn)?.updatedAt || order.updatedAt || order.createdAt,
            ).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
        <StatusPill color="neutral">
          {order.orderType === 'rental' || item.type === 'rental' ? 'Rental' : 'Purchase'}
        </StatusPill>
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
            {item.category ||
              (typeof item.productId === 'object' ? item.productId?.primaryCategory?.name : null) ||
              'Siri Atelier Collection'}
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
            {isRental && item.durationDays && (
              <span className="text-[9px] text-secondary font-medium">
                for {item.durationDays} days
              </span>
            )}
            {!isRental && item.originalPrice && (
              <span className="text-[10px] text-secondary line-through font-light">
                ₹{item.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          {/* Rental period dates */}
          {isRental && item.rentalStartDate && item.rentalEndDate && (
            <p className="text-[9px] text-secondary font-light font-body mt-0.5">
              {new Date(item.rentalStartDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
              {' – '}
              {new Date(item.rentalEndDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
          {/* Security deposit note */}
          {isRental && item.securityDeposit > 0 && (
            <p className="text-[9px] text-[#8c7335] font-medium font-body mt-0.5">
              + ₹{item.securityDeposit.toLocaleString()} refundable deposit
            </p>
          )}
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

      {/* Return/Exchange Window Status Block — purchase only */}
      {!isRental && order.orderStatus?.toLowerCase() === 'delivered' && (
        <div className="px-4 py-2 bg-surface-container-low/40 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-secondary font-body">
          <div className="flex items-center gap-1.5">
            {isNonRefundable ? (
              <svg
                className="w-3.5 h-3.5 text-error/70 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            ) : isReturnActive ? (
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
              {isNonRefundable
                ? 'Return and Exchange not eligible for this product'
                : isReturnActive
                  ? `Exchange/Return window active till ${expiryStr}`
                  : `Return window closed on ${expiryStr}`}
            </span>
          </div>
          {isReturnActive && !isNonRefundable && (
            <StatusPill color="accent" className="text-[8px] px-1.5 py-0.5">
              Active
            </StatusPill>
          )}
        </div>
      )}

      {/* Quick Review Prompt — purchase only */}
      {!isRental && order.orderStatus?.toLowerCase() === 'delivered' && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setReviewingProduct({
              productId: item.productId?._id || item.productId,
              productTitle: prodTitle,
            });
          }}
          className="px-4 py-2.5 bg-amber-50/50 border-t border-dashed border-[#8c7335]/10 flex flex-wrap items-center justify-between gap-2 text-[10px] cursor-pointer hover:bg-amber-100/60 transition-colors group"
        >
          <div className="flex items-center gap-1.5 text-[#8c7335] font-medium">
            <svg
              className="w-3 h-3 text-[#8c7335] fill-[#8c7335] shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span>Review item & win Loyalty Coins!</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="text-[#8c7335] group-hover:text-amber-500 transition-colors p-0.5 flex items-center justify-center"
              >
                <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
