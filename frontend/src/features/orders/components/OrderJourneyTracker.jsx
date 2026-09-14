import React from 'react';
import {
  Check,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Loader2,
  Wallet,
  ArrowRight,
} from 'lucide-react';

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

/**
 * Dynamic timeline and journey tracker showing delivery, return, or exchange stages.
 */
export default function OrderJourneyTracker({
  order,
  status,
  isRental,
  isDelivered,
  isCancelled,
  isReturned,
  isRefunded,
  returnRequest,
  exchangeDetails,
  activeStepRef,
  isResuming,
  setIsResuming,
  resumePayment,
}) {
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
      const historyEntry = order?.statusHistory
        ?.slice()
        .reverse()
        .find((h) => h.status?.toLowerCase()?.replace(' ', '_') === step.key);
      const timestamp = historyEntry
        ? new Date(historyEntry.timestamp)
        : index === 0
          ? new Date(order?.createdAt || order?.orderDate)
          : null;

      let stepStatus = 'pending';
      if (
        index <= currentStatusIndex ||
        (!isRental && isDelivered && index < standardTimeline.length)
      ) {
        stepStatus = 'completed';
      }

      journeySteps.push({
        title: step.title,
        description: step.description,
        timestamp,
        status: stepStatus,
        icon: step.icon,
        color: step.color,
        meta:
          step.key === 'processing' && order?.trackingNumber
            ? `AWB: ${order.trackingNumber}`
            : null,
      });
    });
  } else if (isCancelled) {
    journeySteps.push({
      title: 'Order Placed',
      description: 'Order was placed initially',
      timestamp: new Date(order?.createdAt),
      status: 'completed',
      icon: 'receipt_long',
      color: 'blue',
    });

    journeySteps.push({
      title: 'Order Cancelled',
      description: 'Order was cancelled and will not be shipped',
      timestamp: order?.updatedAt ? new Date(order.updatedAt) : null,
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
        meta: returnRequest.pickup?.courierPartner
          ? `Courier: ${returnRequest.pickup.courierPartner}${returnRequest.pickup.trackingNumber ? ` (AWB: ${returnRequest.pickup.trackingNumber})` : ''}`
          : null,
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

      // Stage 5: Replacement Dispatched
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

      // Optional Balance Refund Settlement Card Step
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
        meta: returnRequest.pickup?.courierPartner
          ? `Courier: ${returnRequest.pickup.courierPartner}${returnRequest.pickup.trackingNumber ? ` (AWB: ${returnRequest.pickup.trackingNumber})` : ''}`
          : null,
      });

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

  // Find active step index
  const firstPendingIndex = journeySteps.findIndex((s) => s.status === 'pending');
  const activeStepIndex =
    firstPendingIndex === -1 ? journeySteps.length - 1 : Math.max(0, firstPendingIndex - 1);
  if (journeySteps[activeStepIndex]?.status === 'completed') {
    journeySteps[activeStepIndex].isCurrent = true;
  } else if (journeySteps[activeStepIndex]?.status === 'error') {
    journeySteps[activeStepIndex].isCurrent = true;
  }

  return (
    <div
      id="journey-tracker"
      className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs relative overflow-hidden"
    >
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
                {!isLast && (
                  <div
                    className={`absolute left-[11px] top-6 bottom-[-4px] w-[2px] transition-colors duration-500 ${
                      isCompleted && journeySteps[idx + 1]?.status !== 'pending'
                        ? 'bg-emerald-500'
                        : 'border-l-2 border-dashed border-outline-variant/40'
                    }`}
                  />
                )}

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

                  {/* Exchange Customer Payment Card */}
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
                              <span>Previous payment attempt failed. Please retry to proceed.</span>
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

                  {/* Exchange Admin Refund Card */}
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
  );
}
