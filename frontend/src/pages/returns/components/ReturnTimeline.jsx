import React from 'react';
import { CheckCircle2, Clock, Truck, PackageCheck, AlertCircle, XCircle } from 'lucide-react';

/**
 * Normalizes any backend operational status into one of 4 customer stages (or terminal states).
 */
export const getCustomerReturnStage = (backendStatus, returnType = 'return') => {
  const s = (backendStatus || '').toLowerCase();

  if (s === 'rejected') return { stage: 'rejected', index: -1 };
  if (s === 'cancelled') return { stage: 'cancelled', index: -1 };

  if (['submitted', 'pending'].includes(s)) {
    return { stage: 'submitted', index: 0 };
  }

  if (
    [
      'approved',
      'return_courier_assigned',
      'pickup_assigned',
      'pickup_accepted',
      'return_picked_up',
      'picked_up',
      'return_in_transit',
    ].includes(s)
  ) {
    return { stage: 'pickup', index: 1 };
  }

  if (
    [
      'return_received',
      'reached_warehouse',
      'inspection_started',
      'inspection_completed',
      'inspection_pending',
      'inspection_passed',
    ].includes(s)
  ) {
    return { stage: 'received', index: 2 };
  }

  if (
    [
      'refund_initiated',
      'refund_completed',
      'refund_triggered',
      'completed',
      'resolved',
      'delivered',
    ].includes(s)
  ) {
    return { stage: 'completed', index: 3 };
  }

  return { stage: 'submitted', index: 0 };
};

const ReturnTimeline = ({
  currentStatus = 'submitted',
  timeline = [],
  returnType = 'return',
  variant = 'full',
  rejectionReason = '',
}) => {
  const isExchange = returnType === 'exchange';
  const { stage, index: currentIndex } = getCustomerReturnStage(currentStatus, returnType);
  const isRejected = stage === 'rejected';
  const isCancelled = stage === 'cancelled';

  // 4 Core Customer Stages
  const stages = [
    {
      key: 'submitted',
      title: 'Request Submitted',
      description: "We've received your request and our team is reviewing it.",
      icon: Clock,
    },
    {
      key: 'pickup',
      title: 'Pickup & In Transit',
      description:
        currentIndex >= 1
          ? 'Approved! Courier partner is scheduled to collect the package.'
          : 'Courier will be scheduled once approved.',
      icon: Truck,
    },
    {
      key: 'received',
      title: 'Item Received & Checked',
      description:
        currentIndex >= 2
          ? 'Item received at our facility and verified.'
          : 'Item will be verified once received.',
      icon: PackageCheck,
    },
    {
      key: 'completed',
      title: isExchange ? 'Replacement Delivered' : 'Refund Completed',
      description: isExchange
        ? 'Your replacement item has been delivered.'
        : 'Your refund has been issued to your payment method.',
      icon: CheckCircle2,
    },
  ];

  // Terminal state banners
  if (isRejected) {
    return (
      <div className="p-5 rounded-2xl bg-red-50/80 border border-red-200 text-left">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-900">Request Declined</h4>
            <p className="text-xs text-red-700 leading-relaxed">
              {rejectionReason ||
                'This request could not be approved based on our return policy inspection. If you believe this is in error, please reach out to customer support.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-left">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-200 text-stone-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-stone-800">Request Cancelled</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              This request was cancelled. No pickup will be scheduled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between">
          {stages.map((stg, i) => {
            const isPassed = i < currentIndex;
            const isCurrent = i === currentIndex;
            const Icon = stg.icon;

            return (
              <React.Fragment key={stg.key}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isPassed || isCurrent
                        ? 'bg-stone-900 border-stone-900 text-white'
                        : 'bg-stone-100 border-stone-200 text-stone-400'
                    } ${isCurrent ? 'ring-4 ring-stone-900/10' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-600 mt-1.5 hidden sm:block">
                    {stg.title}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                      i < currentIndex ? 'bg-stone-900' : 'bg-stone-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Full timeline variant
  return (
    <div className="relative pl-10 space-y-7 before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-stone-200">
      {stages.map((stg, i) => {
        const isPassed = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = stg.icon;

        return (
          <div
            key={stg.key}
            className={`relative flex items-start gap-4 transition-all ${
              isPassed || isCurrent ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <div
              className={`absolute -left-10 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                isPassed
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : isCurrent
                    ? 'bg-stone-900 border-stone-900 text-white shadow-[0_0_0_4px_rgba(42,41,39,0.15)]'
                    : 'bg-white border-stone-300 text-stone-400'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="flex-1 text-left pt-0.5 pl-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  {stg.title}
                </h4>
                {isCurrent && (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-900 text-white tracking-widest">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{stg.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReturnTimeline;
