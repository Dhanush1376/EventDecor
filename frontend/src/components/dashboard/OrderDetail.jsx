import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';
import { useRazorpay } from '../../hooks/useRazorpay';
import toast from 'react-hot-toast';
import { useUserSocket } from '../../context/UserSocketProvider';

const GPSMap = React.lazy(() => import('../../pages/GPSMapLazy'));

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

  const socket = useUserSocket();

  React.useEffect(() => {
    if (!order || !item) return;
    const fetchReturn = async () => {
      try {
        const { returnService } = await import('../../services/api/returnService');
        const res = await returnService.getMyReturns();
        if (res.data?.success) {
          const returns = res.data.data.returns || res.data.data || [];
          const activeReturn = returns.find(
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
      } catch (err) {
        console.error('Failed to load return details', err);
      }
    };

    fetchReturn();

    if (!socket) return;

    const handleUpdate = (data) => {
      // Refresh if the update is for this order
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
    item.imageSrc ||
    (typeof item.productId === 'object'
      ? item.productId?.imageSrc || item.productId?.images?.[0]
      : null) ||
    '';
  const prodVariant = item.variant || 'Default';
  const discount =
    order.discount ||
    (item.originalPrice ? Math.max(0, (item.originalPrice - item.price) * item.quantity) : 0);
  const status = order.orderStatus || 'Confirmed';
  const isDelivered = ['delivered', 'returned', 'refunded', 'settled'].includes(
    status?.toLowerCase(),
  );
  const isCancelled = status?.toLowerCase() === 'cancelled';
  const isReturned = ['returned', 'refunded', 'settled'].includes(status?.toLowerCase());
  const isRefunded =
    status?.toLowerCase() === 'refunded' ||
    order.paymentStatus === 'refunded' ||
    order.refundStatus === 'refunded' ||
    status?.toLowerCase() === 'settled';
  const isShipped =
    isDelivered ||
    ['shipped', 'out for delivery'].includes(status?.toLowerCase()) ||
    (order.trackingNumber ? true : false);

  const isNonRefundable =
    typeof item.productId === 'object' ? item.productId?.isNonRefundable : false;
  const isReturnExchangeBlocked =
    returnRequest || isNonRefundable || isReturned || isRefunded || isCancelled;

  return (
    <div className="space-y-4 text-left font-body">
      {/* Product Summary Header */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
        <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
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
              {item.originalPrice && item.originalPrice > prodPrice && (
                <span className="text-[10px] text-secondary line-through font-light font-body">
                  ₹{(item.originalPrice * (item.quantity || 1)).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Tracker */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
        <div className="pb-4 mb-4 border-b border-outline-variant/20">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
            Delivery Journey
          </h2>
        </div>

        <div className="relative pl-2 py-2">
          {/* Solid Connection Line */}
          <div className="absolute left-[14px] top-4 bottom-4 w-[2px] bg-gray-400" />

          <div className="space-y-6 pl-8">
            {/* Event 1 */}
            <div className="relative">
              <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100/50" />
              <strong className="text-on-surface text-[11px] block font-bold">
                Order Confirmed
              </strong>
              <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                Dispatched into production ledger
              </span>
              <span className="block text-[8px] text-secondary/70 font-mono mt-1">
                {new Date(order.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            {/* Event 2: Shipped */}
            {!isCancelled && (
              <div className="relative">
                <span
                  className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${isShipped ? 'bg-amber-500 ring-2 ring-amber-100/50' : 'bg-outline-variant'}`}
                />
                <strong className="text-on-surface text-[11px] block font-bold">
                  Processed & Shipped
                </strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  In transit with Courier Logistics
                </span>
                {order.trackingNumber && (
                  <span className="block text-[9px] text-[#8c7335] font-semibold uppercase tracking-widest mt-1">
                    AWB: {order.trackingNumber}
                  </span>
                )}
              </div>
            )}

            {/* Event 3: Delivered */}
            {!isCancelled && (
              <div className="relative">
                <span
                  className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${isDelivered ? 'bg-emerald-600 ring-2 ring-emerald-100/50' : 'bg-outline-variant'}`}
                />
                <strong className="text-on-surface text-[11px] block font-bold">
                  Delivery Completed
                </strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  Signature check & hand-off validation active
                </span>
              </div>
            )}

            {/* Cancelled Event */}
            {isCancelled && (
              <div className="relative">
                <span
                  className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100/50`}
                />
                <strong className="text-on-surface text-[11px] block font-bold text-red-600">
                  Order Cancelled
                </strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  Order was cancelled and will not be shipped
                </span>
              </div>
            )}

            {/* Returned Event */}
            {isReturned && (
              <div className="relative">
                <span
                  className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100/50`}
                />
                <strong className="text-on-surface text-[11px] block font-bold">Returned</strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  Item was successfully returned to our facility
                </span>
              </div>
            )}

            {/* Refunded Event */}
            {(isRefunded || isCancelled) && (
              <div className="relative">
                <span
                  className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${isRefunded ? 'bg-emerald-600 ring-2 ring-emerald-100/50' : 'bg-outline-variant'}`}
                />
                <strong className="text-on-surface text-[11px] block font-bold">
                  Refund Processed
                </strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  Amount has been refunded to your original payment method
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Journey Tracker */}
      {returnRequest && (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
          <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">assignment_return</span>
              Return Journey
            </h2>
            <span className="text-[9px] text-secondary font-mono tracking-wider">
              {returnRequest.returnId}
            </span>
          </div>

          <div className="relative pl-2 py-2">
            <div className="absolute left-[14px] top-4 bottom-4 w-[2px] bg-gray-400" />

            <div className="space-y-6 pl-8">
              {/* Event 1 */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100/50" />
                <strong className="text-on-surface text-[11px] block font-bold">
                  Request Submitted
                </strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  Request is under review by our team
                </span>
                <span className="block text-[8px] text-secondary/70 font-mono mt-1">
                  {new Date(returnRequest.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <span
                  className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${
                    [
                      'approved',
                      'pickup_assigned',
                      'pickup_accepted',
                      'picked_up',
                      'reached_warehouse',
                      'inspection_started',
                      'inspection_passed',
                      'refund_triggered',
                      'completed',
                    ].includes(returnRequest.status)
                      ? 'bg-amber-500 ring-2 ring-amber-100/50'
                      : returnRequest.status === 'rejected'
                        ? 'bg-red-500 ring-2 ring-red-100/50'
                        : 'bg-outline-variant'
                  }`}
                />
                <strong className="text-on-surface text-[11px] block font-bold">
                  {returnRequest.status === 'rejected' ? 'Request Rejected' : 'Approved & Pickup'}
                </strong>
                <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                  {returnRequest.status === 'rejected'
                    ? 'Return request was declined'
                    : 'Approved for pickup from your location'}
                </span>
              </div>

              {/* Event 3 */}
              {returnRequest.status !== 'rejected' && (
                <div className="relative">
                  <span
                    className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${
                      ['inspection_passed', 'refund_triggered', 'completed'].includes(
                        returnRequest.status,
                      )
                        ? 'bg-emerald-600 ring-2 ring-emerald-100/50'
                        : 'bg-outline-variant'
                    }`}
                  />
                  <strong className="text-on-surface text-[11px] block font-bold">
                    Quality Check Passed
                  </strong>
                  <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                    Item successfully inspected at warehouse
                  </span>
                </div>
              )}

              {/* Event 4 */}
              {returnRequest.status !== 'rejected' && (
                <div className="relative">
                  <span
                    className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full ${
                      ['refund_triggered', 'completed'].includes(returnRequest.status)
                        ? 'bg-emerald-600 ring-2 ring-emerald-100/50'
                        : 'bg-outline-variant'
                    }`}
                  />
                  <strong className="text-on-surface text-[11px] block font-bold">
                    Refund Processed
                  </strong>
                  <span className="text-[9px] text-secondary block mt-0.5 tracking-wider">
                    Amount credited via {returnRequest.refundMethod || 'Original Method'}
                  </span>
                  {returnRequest.status === 'completed' && (
                    <span className="block text-[8px] text-secondary/70 font-mono mt-1">
                      {new Date(returnRequest.updatedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Review Callout */}
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
                ? 'Share your review to win 50 Loyalty Coins!'
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
          <span className="material-symbols-outlined text-[14px]">edit_note</span> Write Review
        </button>
      </div>

      {/* Split Panels: Delivery Address & Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Address Card */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
          <div className="pb-4 mb-4 border-b border-outline-variant/20">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">pin_drop</span>
              Shipping Destination
            </h2>
          </div>
          {order.shippingAddress ? (
            <div className="p-3 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-[11px]">
              <p className="font-bold text-on-surface uppercase tracking-wider">
                {order.shippingAddress.name}
              </p>
              <p className="text-secondary mt-1 leading-relaxed">
                {order.shippingAddress.addressString || order.shippingAddress.address},{' '}
                {order.shippingAddress.locality}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                {order.shippingAddress.pincode}
              </p>
              <p className="text-[9px] text-secondary mt-2 tracking-widest uppercase font-medium">
                Phone: {order.shippingAddress.phone}
              </p>
            </div>
          ) : (
            <div className="text-[9px] text-secondary italic tracking-wider">
              Address details currently unavailable.
            </div>
          )}
        </div>

        {/* Coordinate Map Panel */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs flex flex-col">
          <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">map</span>
              Destination GPS
            </h2>
            <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-200">
              Synced
            </span>
          </div>
          <div className="relative flex-1 rounded-lg bg-surface-container overflow-hidden border border-outline-variant/20 z-0 min-h-[120px]">
            <React.Suspense
              fallback={<div className="h-full bg-surface-container animate-pulse" />}
            >
              <GPSMap address={order.shippingAddress} />
            </React.Suspense>
          </div>
        </div>
      </div>

      {/* Discount Banner */}
      {discount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">local_offer</span>
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
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs">
        <button
          onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors font-bold text-[9px] uppercase tracking-widest text-on-surface border-b border-outline-variant/20 text-left cursor-pointer bg-transparent"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
            Order Price Breakdown
          </span>
          <span
            className="material-symbols-outlined text-[16px] text-secondary transition-transform duration-200"
            style={{ transform: isPriceDetailsOpen ? 'rotate(180deg)' : 'none' }}
          >
            expand_more
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isPriceDetailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-surface-container-lowest"
            >
              <div className="p-5 space-y-3 border-b border-outline-variant/20 text-[11px] text-on-surface">
                <div className="flex justify-between">
                  <span className="text-secondary">Items Subtotal</span>
                  <span className="font-semibold">
                    ₹
                    {(
                      order.total -
                      (order.shippingFee || 0) +
                      (order.discount || 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Delivery & Shipping Fee</span>
                  <span>{order.shippingFee ? `₹${order.shippingFee}` : 'FREE'}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Premium Coupon Discount</span>
                    <span className="font-semibold">-₹{order.discount.toLocaleString()}</span>
                  </div>
                )}
                {order.codFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">COD Transaction Fees</span>
                    <span>₹{order.codFee}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-dashed border-outline-variant/30 flex justify-between font-bold text-sm text-primary">
                  <span>Amount Paid</span>
                  <span>₹{(order.total || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 bg-surface-container-low/50 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-outline-variant/20">
                <span className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">credit_card</span>
                  Payment: {order.paymentMethod?.toUpperCase() || 'RAZORPAY'}
                </span>
                <span className="text-[8px] text-secondary uppercase tracking-widest">
                  Sold by: Siri Arts & Crafts
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complete Payment Banner for Pending Orders */}
        {order.paymentStatus === 'pending' && order.paymentMethod === 'razorpay' && (
          <div className="bg-amber-50/50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-amber-200/50">
            <span className="text-[9px] uppercase tracking-widest text-amber-800 font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Payment Pending
            </span>
            <button
              disabled={isResuming}
              onClick={() => {
                setIsResuming(true);
                resumePayment(
                  order,
                  () => {
                    toast.success('Payment completed successfully. Refreshing...');
                    window.location.reload();
                  },
                  () => setIsResuming(false),
                );
              }}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 border-0 disabled:opacity-50"
            >
              {isResuming ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>
        )}

        {/* Actions (Return / Exchange & Download Invoice) */}
        <div className="p-5 bg-surface-container-lowest flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[9px] uppercase tracking-widest text-secondary font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Need official copies or assistance?
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {isReturnExchangeBlocked ? (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap opacity-50 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">keyboard_return</span>
                Return Items
              </button>
            ) : (
              <Link
                to={`/dashboard/returns/new?orderId=${order._id}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">keyboard_return</span>
                Return Items
              </Link>
            )}
            {isReturnExchangeBlocked ? (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap opacity-50 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                Exchange Items
              </button>
            ) : (
              <Link
                to={`/dashboard/returns/exchanges/new?orderId=${order._id}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                Exchange Items
              </Link>
            )}
            <button
              onClick={() => downloadInvoice(order._id)}
              className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap border-0"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Download Tax Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-start gap-3 p-4 bg-surface-bright border border-outline-variant/30 rounded-lg shadow-xs">
        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">
          notifications_active
        </span>
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
