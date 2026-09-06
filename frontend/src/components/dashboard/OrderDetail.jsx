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
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Wallet,
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
  const isShipped =
    isDelivered ||
    ['processing'].includes(status?.toLowerCase()) ||
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
      key: 'processing',
      title: 'Processing',
      description: 'Order is being processed',
      icon: 'inventory_2',
      color: 'fuchsia',
    },
    {
      key: 'delivered',
      title: 'Delivered',
      description: 'Package delivered successfully',
      icon: 'home',
      color: 'emerald',
    },
  ];

  const rentalTimeline = [
    {
      key: 'confirmed',
      title: 'Confirmed',
      description: 'Rental verified and confirmed',
      icon: 'check_circle',
      color: 'sky',
    },
    {
      key: 'active_rental',
      title: 'Active Rental',
      description: 'You currently have this item',
      icon: 'timer',
      color: 'emerald',
    },
    {
      key: 'return_requested',
      title: 'Return Requested',
      description: 'Return process initiated',
      icon: 'sync_alt',
      color: 'amber',
    },
    {
      key: 'returned',
      title: 'Returned',
      description: 'Item safely returned to facility',
      icon: 'inventory_2',
      color: 'blue',
    },
    {
      key: 'completed',
      title: 'Completed',
      description: 'Rental cycle finished, deposit settled',
      icon: 'done_all',
      color: 'emerald',
    },
  ];

  const currentStatusLower = status?.toLowerCase()?.replace(' ', '_') || 'pending';

  if (!isCancelled && !returnRequest && !isReturned) {
    const timeline = isRental ? rentalTimeline : standardTimeline;
    const currentStatusIndex = timeline.findIndex((s) => s.key === currentStatusLower);

    timeline.forEach((step, index) => {
      // Find timestamp from history if available
      const historyEntry = order.statusHistory
        ?.slice()
        .reverse()
        .find((h) => h.status?.toLowerCase()?.replace(' ', '_') === step.key);
      const timestamp = historyEntry
        ? new Date(historyEntry.timestamp)
        : index === 0
          ? new Date(order.createdAt || order.orderDate)
          : null;

      let stepStatus = 'pending';
      if (
        index <= currentStatusIndex ||
        (!isRental && isDelivered && index < standardTimeline.length)
      )
        stepStatus = 'completed';

      journeySteps.push({
        title: step.title,
        description: step.description,
        timestamp,
        status: stepStatus,
        icon: step.icon,
        color: step.color,
        meta:
          step.key === 'processing' && order.trackingNumber ? `AWB: ${order.trackingNumber}` : null,
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
    const isExchange = returnRequest.returnType === 'exchange';
    const isRequestRejected = returnRequest.status === 'rejected';
    const isRequestCancelled = returnRequest.status === 'cancelled';

    // Step 1: Submitted
    journeySteps.push({
      title: isExchange ? 'Exchange Submitted' : 'Return Request Submitted',
      description: isExchange
        ? 'Customer request under review'
        : 'Request is under review by our team',
      timestamp: new Date(returnRequest.createdAt),
      status: 'completed',
      icon: isExchange ? 'assignment' : 'assignment_return',
      color: 'blue',
    });

    if (isRequestRejected) {
      journeySteps.push({
        title: isExchange ? 'Exchange Rejected' : 'Request Rejected',
        description: returnRequest.approvalNotes || 'Request was declined after review',
        status: 'error',
        icon: 'cancel',
        color: 'red',
      });
    } else if (isRequestCancelled) {
      journeySteps.push({
        title: isExchange ? 'Exchange Cancelled' : 'Request Cancelled',
        description: 'This request has been cancelled.',
        status: 'error',
        icon: 'cancel',
        color: 'red',
      });
    } else if (isExchange) {
      // ─── EXCHANGE 6-STAGE LIFECYCLE (Mirrors Admin Portal) ───
      const repStatus = exchangeDetails?.replacementStatus || 'pending_stock';

      // Stage 2: Exchange Approved
      const isApproved =
        [
          'approved',
          'return_courier_assigned',
          'return_picked_up',
          'return_in_transit',
          'return_received',
          'inspection_started',
          'inspection_completed',
          'refund_initiated',
          'refund_completed',
          'completed',
        ].includes(returnRequest.status) || ['shipped', 'delivered'].includes(repStatus);

      journeySteps.push({
        title: 'Exchange Approved',
        description: isApproved ? 'Approved by store team' : 'Pending review and approval',
        status: isApproved ? 'completed' : 'pending',
        icon: 'check_circle',
        color: 'amber',
        timestamp:
          isApproved && returnRequest.approvedAt ? new Date(returnRequest.approvedAt) : null,
        isExchangeApprovalStep: exchangeDetails?.differenceAction === 'collect_payment',
      });

      // Stage 3: Item Picked Up
      const isPickedUp =
        [
          'return_picked_up',
          'return_in_transit',
          'return_received',
          'inspection_started',
          'inspection_completed',
          'refund_initiated',
          'refund_completed',
          'completed',
        ].includes(returnRequest.status) || ['shipped', 'delivered'].includes(repStatus);

      const isPaymentRequired = exchangeDetails?.paymentStatus === 'payment_required';
      const isLocked = isPaymentRequired && !isPickedUp;

      let pickupTitle = 'Item Picked Up';
      let pickupDesc = 'Returning item collected by courier';
      if (!isPickedUp) {
        if (returnRequest.status === 'return_courier_assigned') {
          pickupDesc = 'Courier assigned for reverse pickup';
        } else if (isLocked) {
          pickupDesc = 'Waiting for difference payment completion';
        } else {
          pickupDesc = 'Awaiting reverse courier pickup';
        }
      } else {
        if (returnRequest.status === 'return_in_transit') {
          pickupDesc = 'Your returned item is on its way to warehouse';
        } else if (
          [
            'return_received',
            'inspection_started',
            'inspection_completed',
            'refund_initiated',
            'refund_completed',
            'completed',
          ].includes(returnRequest.status) ||
          ['shipped', 'delivered'].includes(repStatus)
        ) {
          pickupDesc = 'Item collected and received at warehouse';
        }
      }

      journeySteps.push({
        title: pickupTitle,
        description: pickupDesc,
        status: isPickedUp ? 'completed' : 'pending',
        icon: 'local_shipping',
        color: 'indigo',
        locked: isLocked,
        timestamp:
          isPickedUp && returnRequest.pickup?.actualPickupTime
            ? new Date(returnRequest.pickup.actualPickupTime)
            : null,
      });

      // Stage 4: Quality Check
      const isQCCompleted =
        ['inspection_completed', 'refund_initiated', 'refund_completed', 'completed'].includes(
          returnRequest.status,
        ) || ['shipped', 'delivered'].includes(repStatus);

      const isQCInProgress = ['return_received', 'inspection_started'].includes(
        returnRequest.status,
      );

      journeySteps.push({
        title: isQCCompleted ? 'Quality Check Passed' : 'Quality Check',
        description: isQCCompleted
          ? 'Item received & verified at warehouse'
          : isQCInProgress
            ? 'Item arrived at warehouse, inspection in progress'
            : 'Awaiting warehouse inspection after pickup',
        status: isQCCompleted ? 'completed' : 'pending',
        icon: 'fact_check',
        color: 'purple',
        timestamp:
          isQCCompleted && returnRequest.inspectedAt ? new Date(returnRequest.inspectedAt) : null,
      });

      // Stage 5: Replacement Dispatched (Only completed once shipped/delivered, NOT when just reserved)
      const isDispatched =
        ['shipped', 'delivered'].includes(repStatus) || returnRequest.status === 'completed';

      let repDesc = 'New replacement package on the way';
      let trackingMeta = null;

      if (isDispatched) {
        if (repStatus === 'delivered' || returnRequest.status === 'completed') {
          repDesc = 'Replacement item has been delivered';
        } else if (exchangeDetails?.trackingNumber) {
          repDesc = `Dispatched via ${exchangeDetails.courierPartner || 'courier'} (AWB: ${exchangeDetails.trackingNumber})`;
          trackingMeta = {
            awb: exchangeDetails.trackingNumber,
            courier: exchangeDetails.courierPartner,
          };
        } else {
          repDesc = 'New replacement package on the way';
        }
      } else {
        if (repStatus === 'reserved') {
          repDesc = 'Replacement item reserved in stock; dispatching after quality check';
        } else {
          repDesc = 'Replacement package being prepared';
        }
      }

      journeySteps.push({
        title: 'Replacement Dispatched',
        description: repDesc,
        timestamp:
          isDispatched && exchangeDetails?.dispatchedAt
            ? new Date(exchangeDetails.dispatchedAt)
            : null,
        status: isDispatched ? 'completed' : 'pending',
        icon: 'inventory_2',
        color: 'blue',
        tracking: trackingMeta,
      });

      // Stage 6: Exchange Completed
      const isExchangeFinished = returnRequest.status === 'completed' || repStatus === 'delivered';

      journeySteps.push({
        title: 'Exchange Completed',
        description: isExchangeFinished
          ? 'Delivered & exchange finalized'
          : 'Exchange finalized upon replacement delivery',
        timestamp:
          isExchangeFinished && returnRequest.completedAt
            ? new Date(returnRequest.completedAt)
            : null,
        status: isExchangeFinished ? 'completed' : 'pending',
        icon: 'verified',
        color: 'emerald',
      });

      // Optional Balance Refund Settlement Card Step (when store owes difference to customer)
      if (
        exchangeDetails &&
        exchangeDetails.differenceAction === 'refund_difference' &&
        ((exchangeDetails.priceDifference && exchangeDetails.priceDifference > 0) ||
          (returnRequest.refundBreakdown?.grandTotal &&
            returnRequest.refundBreakdown.grandTotal > 0))
      ) {
        const isRefundDone = ['refund_completed', 'completed'].includes(returnRequest.status);
        const refundAmt =
          exchangeDetails.priceDifference || returnRequest.refundBreakdown?.grandTotal || 0;
        const isWallet = returnRequest.refundMethod === 'wallet';
        const upi = returnRequest.upiId || exchangeDetails.upiId;

        let refundDesc = '';
        if (isRefundDone) {
          refundDesc = isWallet
            ? `₹${refundAmt} credited to your store wallet`
            : `₹${refundAmt} refunded to your account ${upi ? `(${upi})` : ''}`;
        } else {
          refundDesc = isWallet
            ? `₹${refundAmt} will be credited to your store wallet upon exchange completion`
            : `₹${refundAmt} will be transferred to your account ${upi ? `(${upi})` : ''} upon exchange completion`;
        }

        journeySteps.push({
          title: isRefundDone ? 'Balance Refund Settled' : 'Balance Refund',
          description: refundDesc,
          timestamp: isRefundDone ? new Date(returnRequest.updatedAt) : null,
          status: isRefundDone ? 'completed' : 'pending',
          icon: 'account_balance_wallet',
          color: isRefundDone ? 'emerald' : 'amber',
          isExchangeRefundStep: true,
        });
      }
    } else {
      // ─── STANDARD RETURN LIFECYCLE ───
      // Step 2: Approved
      const isApproved = [
        'approved',
        'return_courier_assigned',
        'return_picked_up',
        'return_in_transit',
        'return_received',
        'inspection_started',
        'inspection_completed',
        'refund_initiated',
        'refund_completed',
        'completed',
      ].includes(returnRequest.status);

      journeySteps.push({
        title: 'Return Approved',
        description: isApproved ? 'Approved by our team' : 'Pending approval',
        status: isApproved ? 'completed' : 'pending',
        icon: 'thumb_up',
        color: 'amber',
      });

      // Step 3: Pickup
      const isPickupScheduled = [
        'return_courier_assigned',
        'return_picked_up',
        'return_in_transit',
        'return_received',
        'inspection_started',
        'inspection_completed',
        'refund_initiated',
        'refund_completed',
        'completed',
      ].includes(returnRequest.status);

      let pickupTitle = 'Pickup Scheduled';
      let pickupDesc = isPickupScheduled
        ? 'A courier has been assigned to collect your item'
        : 'Awaiting courier assignment';

      if (['return_picked_up'].includes(returnRequest.status)) {
        pickupTitle = 'Item Picked Up';
        pickupDesc = 'Your item has been collected';
      } else if (['return_in_transit'].includes(returnRequest.status)) {
        pickupTitle = 'Item In Transit';
        pickupDesc = 'Your returned item is on its way to our facility';
      } else if (
        [
          'return_received',
          'inspection_started',
          'inspection_completed',
          'refund_initiated',
          'refund_completed',
          'completed',
        ].includes(returnRequest.status)
      ) {
        pickupTitle = 'Item Received';
        pickupDesc = "We've received your item";
      }

      journeySteps.push({
        title: pickupTitle,
        description: pickupDesc,
        status: isPickupScheduled ? 'completed' : 'pending',
        icon: 'local_shipping',
        color: 'blue',
      });

      // Step 4: Quality Check
      const isQC = [
        'inspection_started',
        'inspection_completed',
        'refund_initiated',
        'refund_completed',
        'completed',
      ].includes(returnRequest.status);

      journeySteps.push({
        title: 'Quality Check',
        description: isQC
          ? 'Item successfully inspected at warehouse'
          : 'Awaiting warehouse inspection',
        status: isQC ? 'completed' : 'pending',
        icon: 'fact_check',
        color: 'emerald',
      });

      // Step 5: Refund Processed
      const isRefundedStatus = ['refund_initiated', 'refund_completed', 'completed'].includes(
        returnRequest.status,
      );
      journeySteps.push({
        title: 'Refund Processed',
        description: isRefundedStatus
          ? `Amount credited via ${returnRequest.refundMethod || 'Original Method'}`
          : 'Awaiting refund processing',
        timestamp: isRefundedStatus ? new Date(returnRequest.updatedAt) : null,
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
      purple: 'bg-purple-500 border-purple-500 text-white',
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

                    {/* 1. Exchange Customer Payment Card (Shown at Approval step when customer owes difference) */}
                    {step.isExchangeApprovalStep &&
                      exchangeDetails &&
                      exchangeDetails.differenceAction === 'collect_payment' && (
                        <div className="mt-3.5 p-4 rounded-xl bg-linear-to-br from-[#FDFBF7] to-[#F7F4EC] border border-[#D4AF37]/40 shadow-xs">
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-outline-variant/20">
                            <div className="flex items-center gap-1.5 text-secondary text-[9px] uppercase tracking-widest font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Exchange Price Difference</span>
                            </div>
                            <span className="text-[12px] font-bold text-[#2A2927]">
                              ₹{exchangeDetails.priceDifference}
                            </span>
                          </div>

                          {exchangeDetails.paymentStatus === 'payment_paid' ? (
                            <div className="mt-2.5 flex items-center gap-2 text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 p-2.5 rounded-lg">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="text-[10px] leading-tight">
                                <span className="font-bold uppercase tracking-wider block">
                                  Payment Verified
                                </span>
                                <span className="text-secondary text-[9px]">
                                  Your replacement order is unlocked and being processed.
                                </span>
                              </div>
                            </div>
                          ) : exchangeDetails.paymentStatus === 'failed' ? (
                            <div className="mt-2.5 space-y-2">
                              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg text-[9px]">
                                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                                <span>
                                  Previous payment attempt failed. Please retry to proceed.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsResuming(true);
                                  resumePayment(
                                    exchangeDetails.additionalPaymentId,
                                    exchangeDetails.priceDifference,
                                  ).finally(() => setIsResuming(false));
                                }}
                                disabled={isResuming}
                                className="w-full py-2.5 px-4 bg-[#2A2927] hover:bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50"
                              >
                                {isResuming ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Retrying...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-[#D4AF37]" /> Retry Payment (₹
                                    {exchangeDetails.priceDifference})
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2.5">
                              <p className="text-[9.5px] text-secondary leading-relaxed">
                                Please complete the price difference payment to confirm your
                                replacement item dispatch.
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsResuming(true);
                                  resumePayment(
                                    exchangeDetails.additionalPaymentId,
                                    exchangeDetails.priceDifference,
                                  ).finally(() => setIsResuming(false));
                                }}
                                disabled={isResuming}
                                className="w-full py-3 px-4 bg-[#2A2927] hover:bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50"
                              >
                                {isResuming ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting to
                                    Secure Gateway...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                                    <span>Pay ₹{exchangeDetails.priceDifference} Securely Now</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                              <div className="flex items-center justify-center gap-2 text-[8px] uppercase tracking-widest text-secondary/70">
                                <span>UPI</span> • <span>Cards</span> • <span>NetBanking</span> •{' '}
                                <span>100% Encrypted</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {/* 2. Exchange Admin Refund Card (Positioned strictly at the final step) */}
                    {step.isExchangeRefundStep &&
                      exchangeDetails &&
                      exchangeDetails.differenceAction === 'refund_difference' && (
                        <div className="mt-3.5 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30 shadow-xs">
                          <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant/20">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-secondary flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5 text-[#D4AF37]" />
                              Balance Refund Amount
                            </span>
                            <span className="text-[12px] font-bold text-[#2A2927]">
                              ₹{exchangeDetails.priceDifference}
                            </span>
                          </div>

                          <div className="mt-2.5 text-[9.5px] space-y-1.5">
                            <div className="flex justify-between text-secondary">
                              <span>Refund Destination:</span>
                              <span className="font-bold text-[#2A2927]">
                                {returnRequest.refundMethod === 'wallet'
                                  ? 'Store Wallet'
                                  : 'Direct Bank / UPI Transfer'}
                              </span>
                            </div>
                            {(returnRequest.upiId || exchangeDetails.upiId) && (
                              <div className="flex justify-between text-secondary">
                                <span>Recipient UPI ID:</span>
                                <span className="font-mono font-bold text-emerald-700">
                                  {returnRequest.upiId || exchangeDetails.upiId}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-secondary">
                              Settlement Status
                            </span>
                            {['completed', 'refund_completed'].includes(returnRequest.status) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Refund Settled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200">
                                Pending Settlement
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
                {!isRental ? (
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
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-secondary">Rental Charge</span>
                      <span className="font-semibold">
                        ₹
                        {(
                          order.total -
                          (order.shippingFee || 0) +
                          (order.discount || 0) -
                          (item.securityDeposit || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                    {item.securityDeposit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Refundable Security Deposit</span>
                        <span className="font-semibold">
                          ₹{item.securityDeposit.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
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
            {!isRental && (
              <>
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
                    to={`/dashboard/returns/new?orderId=${order._id || order.id}`}
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
                    to={`/dashboard/returns/exchanges/new?orderId=${order._id || order.id}`}
                    className="w-full sm:w-auto px-6 py-2.5 bg-surface hover:bg-surface-container-low text-on-surface font-bold uppercase tracking-widest text-[9px] rounded-lg border border-outline-variant/30 shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <ArrowLeftRight className="text-[14px]" strokeWidth={1.5} />
                    Exchange Items
                  </Link>
                )}
              </>
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
    </div>
  );
}
