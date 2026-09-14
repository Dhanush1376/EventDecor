import { PackageCheck, FileEdit, Tag, BellRing } from 'lucide-react';
import React, { useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useRazorpay } from '../../hooks/useRazorpay';
import { useUserSocket } from '../../context/UserSocketProvider';
import { ReturnExchangeSection } from './ReturnExchangeSection';
import {
  OrderDeliveryAddressCard,
  RentalDepositStatusCard,
  OrderPricingSummaryCard,
  OrderJourneyTracker,
} from '../../features/orders/components';

export function OrderDetail() {
  const {
    selectedOrder: order,
    selectedItem: item,
    _selectedOrderItemIndex,
    isPriceDetailsOpen,
    setIsPriceDetailsOpen,
    downloadInvoice,
    setReviewingProduct,
    user,
  } = useDashboard();
  const { resumePayment } = useRazorpay();
  const [isResuming, setIsResuming] = React.useState(false);
  const [returnRequest, setReturnRequest] = React.useState(null);
  const [exchangeDetails, setExchangeDetails] = React.useState(null);
  const activeStepRef = React.useRef(null);

  const socket = useUserSocket();

  useEffect(() => {
    if (!order?.statusHistory?.length) return;

    // Update local storage to mark this order as viewed
    const initialViews = JSON.parse(localStorage.getItem('siri_order_views') || '{}');
    initialViews[order._id || order.id] = Date.now();
    localStorage.setItem('siri_order_views', JSON.stringify(initialViews));
    window.dispatchEvent(new Event('siri_order_views_updated'));
  }, [order]);

  React.useEffect(() => {
    if (!order || !item) return;
    const fetchReturn = async () => {
      try {
        const { returnService } = await import('../../services/api/returnService');
        const res = await returnService.getMyReturns();
        let activeReturn = null;
        if (res.data?.success) {
          const returns = res.data.data.returns || res.data.data || [];
          activeReturn = returns.find(
            (r) =>
              (typeof r.orderId === 'object' ? r.orderId._id || r.orderId.id : r.orderId) ===
                (order._id || order.id) &&
              r.items.some(
                (ri) =>
                  (typeof ri.productId === 'object' ? ri.productId._id : ri.productId) ===
                  (typeof item.productId === 'object' ? item.productId._id : item.productId),
              ),
          );
          setReturnRequest(activeReturn || null);
        }

        if (activeReturn && activeReturn.returnType === 'exchange') {
          const exRes = await returnService.getMyExchanges();
          if (exRes.data?.success) {
            const exchanges = exRes.data.data.exchanges || exRes.data.data || [];
            const activeEx = exchanges.find(
              (e) =>
                (typeof e.returnRequestId === 'object'
                  ? e.returnRequestId._id
                  : e.returnRequestId) === activeReturn._id,
            );
            setExchangeDetails(activeEx || null);
          }
        } else {
          setExchangeDetails(null);
        }
      } catch (err) {
        console.error('Failed to load return details', err);
      }
    };

    fetchReturn();

    if (!socket) return;

    const handleUpdate = (data) => {
      if (!data || data.orderId === (order._id || order.id)) {
        fetchReturn();
      }
    };

    socket.on('return:status_updated', handleUpdate);
    socket.on('return:created', handleUpdate);

    return () => {
      socket.off('return:status_updated', handleUpdate);
      socket.off('return:created', handleUpdate);
    };
  }, [order, item, socket]);

  if (!order || !item) return null;

  const prodTitle =
    item.title ||
    (typeof item.productId === 'object' ? item.productId?.title : null) ||
    'Artisanal Piece';
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
  const prodVariant = item.variant || 'Default';
  const discount =
    order.discount ||
    (item.originalPrice ? Math.max(0, (item.originalPrice - item.price) * item.quantity) : 0);
  const status = order.orderStatus || order.status || 'Confirmed';
  const isRental =
    order.isRental === true || order.orderType === 'rental' || item.type === 'rental';

  const isDelivered = [
    'delivered',
    'returned',
    'refunded',
    'settled',
    'active_rental',
    'active rental',
  ].includes(status?.toLowerCase());
  const isCancelled = status?.toLowerCase() === 'cancelled';
  const isReturned = ['returned', 'refunded', 'settled'].includes(status?.toLowerCase());
  const isRefunded =
    status?.toLowerCase() === 'refunded' ||
    order.paymentStatus === 'refunded' ||
    order.refundStatus === 'refunded' ||
    status?.toLowerCase() === 'settled';

  const isNonRefundable =
    typeof item.productId === 'object' ? item.productId?.isNonRefundable : false;
  const isReturnExchangeBlocked =
    !isDelivered || returnRequest || isNonRefundable || isReturned || isRefunded || isCancelled;

  return (
    <div className="space-y-4 text-left font-body">
      {/* Product Summary Header */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
        <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center relative">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 pl-2">
            <PackageCheck className="text-[14px]" strokeWidth={1.5} />
            Order Overview
          </h2>
          <span className="text-[9px] text-secondary font-mono tracking-wider">
            ID: {order._id}
          </span>
        </div>

        <div className="flex flex-row items-center gap-4">
          <div className="w-16 h-16 rounded overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0 shadow-sm">
            <OptimizedImage
              src={prodImage}
              alt={prodTitle}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[12px] truncate text-on-surface">{prodTitle}</h3>
            <p className="text-[10px] text-secondary mt-1 tracking-wider">
              Variant: {prodVariant} • Qty: {item.quantity || 1}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-[12px] font-bold text-primary font-body">
                ₹{(prodPrice * (item.quantity || 1)).toLocaleString()}
              </span>
              {isRental && item.durationDays && (
                <span className="text-[10px] text-secondary font-medium font-body">
                  for {item.durationDays} days
                </span>
              )}
              {!isRental && item.originalPrice && item.originalPrice > prodPrice && (
                <span className="text-[10px] text-secondary line-through font-light font-body">
                  ₹{(item.originalPrice * (item.quantity || 1)).toLocaleString()}
                </span>
              )}
            </div>
            {/* Rental specific dates and deposit */}
            {isRental && item.rentalStartDate && item.rentalEndDate && (
              <p className="text-[10px] text-secondary font-light mt-1.5 font-body">
                Period:{' '}
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
            {isRental && item.securityDeposit > 0 && (
              <p className="text-[10px] text-[#8c7335] font-medium mt-0.5 font-body">
                Includes ₹{item.securityDeposit.toLocaleString()} refundable deposit
              </p>
            )}
          </div>
        </div>
      </div>

      {!isRental && <ReturnExchangeSection orderId={order._id || order.id} />}

      {/* Dynamic Timeline Tracker */}
      <OrderJourneyTracker
        order={order}
        status={status}
        isRental={isRental}
        isDelivered={isDelivered}
        isCancelled={isCancelled}
        isReturned={isReturned}
        isRefunded={isRefunded}
        returnRequest={returnRequest}
        exchangeDetails={exchangeDetails}
        activeStepRef={activeStepRef}
        isResuming={isResuming}
        setIsResuming={setIsResuming}
        resumePayment={resumePayment}
      />

      {/* Loyalty Review Callout — Purchase only */}
      {!isRental && (
        <div
          className={`bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs transition-all flex items-center justify-between gap-4 ${!isDelivered ? 'opacity-75 grayscale-[50%]' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/5 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <span className="material-symbols-outlined text-[16px]">stars</span>
            </div>
            <div>
              <h4 className="font-bold text-[9px] uppercase tracking-widest text-on-surface">
                Rate this Artisan Masterpiece
              </h4>
              <p className="text-[9px] text-secondary tracking-wider mt-0.5">
                {isDelivered
                  ? 'Share your review to win Loyalty Coins!'
                  : 'Unlocks once item is successfully delivered.'}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              isDelivered &&
              setReviewingProduct({
                productId: item.productId?._id || item.productId,
                productTitle: prodTitle,
              })
            }
            disabled={!isDelivered}
            className="px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <FileEdit className="text-[14px]" strokeWidth={1.5} /> Write Review
          </button>
        </div>
      )}

      {/* Rental Security Deposit Status Card */}
      <RentalDepositStatusCard isRental={isRental} order={order} item={item} />

      {/* Split Panels: Delivery Address & Map Grid */}
      <OrderDeliveryAddressCard shippingAddress={order.shippingAddress} />

      {/* Discount Banner */}
      {discount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Tag className="text-[14px]" strokeWidth={1.5} />
            <span className="text-[9px] font-bold uppercase tracking-widest">
              Premium Discount Applied
            </span>
          </div>
          <strong className="text-[11px] font-body text-emerald-950">
            Saved ₹{discount.toLocaleString()}
          </strong>
        </div>
      )}

      {/* Collapsible Payment Details Panel */}
      <OrderPricingSummaryCard
        order={order}
        item={item}
        isRental={isRental}
        isPriceDetailsOpen={isPriceDetailsOpen}
        setIsPriceDetailsOpen={setIsPriceDetailsOpen}
        isResuming={isResuming}
        setIsResuming={setIsResuming}
        resumePayment={resumePayment}
        downloadInvoice={downloadInvoice}
        returnRequest={returnRequest}
        isReturnExchangeBlocked={isReturnExchangeBlocked}
        isDelivered={isDelivered}
        isNonRefundable={isNonRefundable}
      />

      {/* Footer Info */}
      <div className="flex items-start gap-3 p-4 bg-surface-bright border border-outline-variant/30 rounded-lg shadow-xs">
        <BellRing className="text-primary text-[16px] mt-0.5" strokeWidth={1.5} />
        <div className="space-y-2">
          <p className="text-[10px] text-secondary tracking-wider leading-relaxed">
            Real-time dispatch and delivery status updates are forwarded automatically to{' '}
            <strong className="text-on-surface">{user?.phone || 'your mobile contact'}</strong> and{' '}
            <strong className="text-on-surface">{user?.email}</strong>.
          </p>
          <div className="text-[8px] text-secondary/60 font-bold uppercase tracking-widest flex items-center gap-3">
            <span>
              Ordered:{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {order.trackingNumber && <span>AWB: {order.trackingNumber}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
