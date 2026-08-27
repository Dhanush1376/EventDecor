import {
  PackageCheck,
  Check,
  FileEdit,
  Map,
  Tag,
  Receipt,
  ChevronDown,
  CreditCard,
  AlertTriangle,
  Info,
  CornerDownLeft,
  ArrowLeftRight,
  Download,
  BellRing,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useRazorpay } from '../../hooks/useRazorpay';
import toast from 'react-hot-toast';
import { useUserSocket } from '../../context/UserSocketProvider';
import { ReturnExchangeSection } from './ReturnExchangeSection';

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

  // We'll calculate the true activeStepIndex further down.

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
    !isDelivered || returnRequest || isNonRefundable || isReturned || isRefunded || isCancelled;

  // --- Dynamic Journey Steps Generation ---
  const journeySteps = [];

  const standardTimeline = [
    {
      key: 'pending',
      title: 'Payment Pending / Order Placed',
      description: 'Order has been placed',
      icon: 'credit_card',
      color: 'slate',
    },
    {
      key: 'confirmed',
      title: 'Confirmed',
      description: 'Order confirmed and verified',
      icon: 'check_circle',
      color: 'sky',
    },
    {
      key: 'packed',
      title: 'Packed',
      description: 'Items securely packed',
      icon: 'inventory_2',
      color: 'fuchsia',
    },
    {
      key: 'ready to ship',
      title: 'Ready to Ship',
      description: 'Awaiting courier pickup',
      icon: 'schedule',
      color: 'amber',
    },
    {
      key: 'shipped',
      title: 'Shipped',
      description: 'In transit with logistics',
      icon: 'local_shipping',
      color: 'orange',
    },
    {
      key: 'out for delivery',
      title: 'Out for Delivery',
      description: 'Arriving soon',
      icon: 'directions_car',
      color: 'teal',
    },
    {
      key: 'delivered',
      title: 'Delivered',
      description: 'Package delivered successfully',
      icon: 'home',
      color: 'emerald',
    },
  ];

  const currentStatusLower = status?.toLowerCase() || 'pending';

  if (!isCancelled && !returnRequest && !isReturned) {
    const currentStatusIndex = standardTimeline.findIndex((s) => s.key === currentStatusLower);

    standardTimeline.forEach((step, index) => {
      // Find timestamp from history if available
      const historyEntry = order.statusHistory
        ?.slice()
        .reverse()
        .find((h) => h.status?.toLowerCase() === step.key);
      const timestamp = historyEntry
        ? new Date(historyEntry.timestamp)
        : index === 0
          ? new Date(order.createdAt)
          : null;

      let stepStatus = 'pending';
      if (index <= currentStatusIndex || isDelivered) stepStatus = 'completed';

      journeySteps.push({
        title: step.title,
        description: step.description,
        timestamp,
        status: stepStatus,
        icon: step.icon,
        color: step.color,
        meta:
          step.key === 'shipped' && order.trackingNumber ? `AWB: ${order.trackingNumber}` : null,
      });
    });
  } else if (isCancelled) {
    // Show partial timeline until cancelled
    journeySteps.push({
      title: 'Order Placed',
      description: 'Order was placed initially',
      timestamp: new Date(order.createdAt),
      status: 'completed',
      icon: 'receipt_long',
      color: 'blue',
    });

    journeySteps.push({
      title: 'Order Cancelled',
      description: 'Order was cancelled and will not be shipped',
      timestamp: order.updatedAt ? new Date(order.updatedAt) : null,
      status: 'error',
      icon: 'cancel',
      color: 'red',
    });
  }

  if (returnRequest) {
    journeySteps.push({
      title: 'Return Request Submitted',
      description: 'Request is under review by our team',
      timestamp: new Date(returnRequest.createdAt),
      status: 'completed',
      icon: 'assignment_return',
      color: 'blue',
    });

    const isReturnRejected = returnRequest.status === 'rejected';
    const isReturnApproved = [
      'approved',
      'pickup_assigned',
      'pickup_accepted',
      'picked_up',
      'reached_warehouse',
      'inspection_started',
      'inspection_passed',
      'refund_triggered',
      'completed',
    ].includes(returnRequest.status);

    journeySteps.push({
      title: isReturnRejected ? 'Return Request Rejected' : 'Return Approved & Pickup',
      description: isReturnRejected
        ? 'Return request was declined'
        : 'Approved for pickup from your location',
      status: isReturnRejected ? 'error' : isReturnApproved ? 'completed' : 'pending',
      icon: isReturnRejected ? 'cancel' : 'thumb_up',
      color: isReturnRejected ? 'red' : 'amber',
    });

    if (!isReturnRejected) {
      const isQCPassed = ['inspection_passed', 'refund_triggered', 'completed'].includes(
        returnRequest.status,
      );
      journeySteps.push({
        title: 'Return Quality Check',
        description: 'Item successfully inspected at warehouse',
        status: isQCPassed ? 'completed' : 'pending',
        icon: 'fact_check',
        color: 'emerald',
      });

      const isRefundedStatus = ['refund_triggered', 'completed'].includes(returnRequest.status);
      journeySteps.push({
        title: 'Refund Processed',
        description: `Amount credited via ${returnRequest.refundMethod || 'Original Method'}`,
        timestamp: returnRequest.status === 'completed' ? new Date(returnRequest.updatedAt) : null,
        status: isRefundedStatus ? 'completed' : 'pending',
        icon: 'account_balance_wallet',
        color: 'emerald',
      });
    }
  } else {
    if (isReturned) {
      journeySteps.push({
        title: 'Returned',
        description: 'Item was successfully returned to our facility',
        status: 'completed',
        icon: 'assignment_return',
        color: 'amber',
      });
    }
    if (isRefunded || isCancelled) {
      journeySteps.push({
        title: 'Refund Processed',
        description: 'Amount has been refunded to your original payment method',
        status: 'completed',
        icon: 'currency_exchange',
        color: 'emerald',
      });
    }
  }

  // Find the "current" active step
  const firstPendingIndex = journeySteps.findIndex((s) => s.status === 'pending');
  const activeStepIndex =
    firstPendingIndex === -1 ? journeySteps.length - 1 : Math.max(0, firstPendingIndex - 1);
  if (journeySteps[activeStepIndex]?.status === 'completed') {
    journeySteps[activeStepIndex].isCurrent = true;
  } else if (journeySteps[activeStepIndex]?.status === 'error') {
    journeySteps[activeStepIndex].isCurrent = true;
  }

  const getColorClasses = (color, status, isCurrent) => {
    if (status === 'pending')
      return 'bg-surface-container-high border-outline-variant text-secondary';
    if (status === 'error')
      return 'bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]';

    const colors = {
      slate: 'bg-slate-500 border-slate-500 text-white',
      sky: 'bg-sky-500 border-sky-500 text-white',
      blue: 'bg-blue-500 border-blue-500 text-white',
      indigo: 'bg-indigo-500 border-indigo-500 text-white',
      violet: 'bg-violet-500 border-violet-500 text-white',
      fuchsia: 'bg-fuchsia-500 border-fuchsia-500 text-white',
      amber: 'bg-amber-500 border-amber-500 text-white',
      orange: 'bg-orange-500 border-orange-500 text-white',
      emerald: 'bg-emerald-500 border-emerald-500 text-white',
      teal: 'bg-teal-500 border-teal-500 text-white',
      red: 'bg-red-500 border-red-500 text-white',
    };

    let classes = colors[color] || colors.blue;
    if (isCurrent) {
      classes += ` shadow-[0_0_15px_var(--color-${color}-500,rgba(59,130,246,0.4))] ring-4 ring-${color}-500/20`;
    }
    return classes;
  };

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
              {item.originalPrice && item.originalPrice > prodPrice && (
                <span className="text-[10px] text-secondary line-through font-light font-body">
                  ₹{(item.originalPrice * (item.quantity || 1)).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Timeline Tracker */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

        <div className="pb-4 mb-2 border-b border-outline-variant/15">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-primary">route</span>
            Journey Tracker
          </h2>
        </div>

        <div className="relative pt-3">
          <div className="space-y-0">
            {journeySteps.map((step, idx) => {
              const isLast = idx === journeySteps.length - 1;
              const isCompleted = step.status === 'completed';
              const isError = step.status === 'error';

              return (
                <div
                  key={idx}
                  ref={step.isCurrent ? activeStepRef : null}
                  className="relative pl-8 pb-6 group"
                >
                  {/* Connecting Line Segment */}
                  {!isLast && (
                    <div
                      className={`absolute left-[11px] top-6 bottom-[-4px] w-[2px] transition-colors duration-500 ${
                        isCompleted && journeySteps[idx + 1]?.status !== 'pending'
                          ? 'bg-emerald-500'
                          : 'border-l-2 border-dashed border-outline-variant/40'
                      }`}
                    />
                  )}

                  {/* Step Icon / Dot */}
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 z-10 shrink-0 overflow-hidden ${getColorClasses(step.color, step.status, step.isCurrent)}`}
                  >
                    {step.status === 'completed' && !step.isCurrent ? (
                      <Check
                        className="font-bold flex items-center justify-center w-full h-full leading-none"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <span
                        className="material-symbols-outlined flex items-center justify-center w-full h-full leading-none"
                        style={{ fontSize: '14px' }}
                      >
                        {step.icon}
                      </span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div
                    className={`transition-all duration-300 ${step.status === 'pending' ? 'opacity-60' : 'opacity-100'} pl-2`}
                  >
                    <strong
                      className={`text-[11px] block font-bold tracking-wide ${isError ? 'text-red-600' : 'text-on-surface'}`}
                    >
                      {step.title}
                    </strong>
                    <span className="text-[9px] text-secondary block mt-0.5 tracking-wider leading-relaxed">
                      {step.description}
                    </span>

                    {step.meta && (
                      <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-surface-container-low border border-outline-variant/30 rounded text-[8px] text-primary font-semibold uppercase tracking-widest">
                        {step.meta}
                      </span>
                    )}

                    {step.timestamp && (
                      <span className="block text-[8px] text-secondary/60 font-mono mt-1 uppercase tracking-wider">
                        {step.timestamp.toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
              <Map className="text-[14px]" strokeWidth={1.5} />
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
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs">
        <button
          onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors font-bold text-[9px] uppercase tracking-widest text-on-surface border-b border-outline-variant/20 text-left cursor-pointer bg-transparent"
        >
          <span className="flex items-center gap-1.5">
            <Receipt className="text-[14px]" strokeWidth={1.5} />
            Order Price Breakdown
          </span>
          <ChevronDown
            className="text-[16px] text-secondary transition-transform duration-200"
            strokeWidth={1.5}
          />
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
                  <CreditCard className="text-[14px]" strokeWidth={1.5} />
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
              <AlertTriangle className="text-[14px]" strokeWidth={1.5} />
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
            <Info className="text-[14px]" strokeWidth={1.5} />
            Need official copies or assistance?
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {isReturnExchangeBlocked ? (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap opacity-50 cursor-not-allowed"
              >
                <CornerDownLeft className="text-[14px]" strokeWidth={1.5} />
                Return Items
              </button>
            ) : (
              <Link
                to={`/dashboard/returns/new?orderId=${order._id}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <CornerDownLeft className="text-[14px]" strokeWidth={1.5} />
                Return Items
              </Link>
            )}
            {isReturnExchangeBlocked ? (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-surface text-secondary font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap opacity-50 cursor-not-allowed"
              >
                <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
                Exchange Items
              </button>
            ) : (
              <Link
                to={`/dashboard/returns/exchanges/new?orderId=${order._id}`}
                className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
                Exchange Items
              </Link>
            )}
            <button
              onClick={() => downloadInvoice(order._id)}
              className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap border-0"
            >
              <Download className="text-[14px]" strokeWidth={1.5} />
              View Invoice
            </button>
          </div>
        </div>
      </div>

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

      <ReturnExchangeSection orderId={order._id} />
    </div>
  );
}
