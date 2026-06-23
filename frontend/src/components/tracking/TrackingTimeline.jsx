import React from 'react';
import { m as motion } from 'framer-motion';

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Packed: 'inventory_2',
  'Ready to Ship': 'local_shipping',
  Shipped: 'local_shipping',
  'Out for Delivery': 'directions_run',
  Delivered: 'check_circle',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
};

const trackingSteps = [
  'Pending',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export function TrackingTimeline({ orderStatus }) {
  const activeIndex = trackingSteps.indexOf(orderStatus);

  return (
    <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-xs">
      <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">route</span>
        <span>Transit Progress Tracker</span>
      </h2>

      {/* Desktop Timeline */}
      <div className="hidden sm:flex items-center justify-between gap-1 overflow-x-auto pb-4">
        {trackingSteps.map((step, idx) => {
          const active =
            idx <= activeIndex &&
            orderStatus !== 'Cancelled' &&
            orderStatus !== 'Returned' &&
            orderStatus !== 'Refunded';
          const isCurrent = step === orderStatus;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center shrink-0 w-24 relative">
                <motion.div
                  animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-[20px] transition-all shadow-sm border ${
                    isCurrent
                      ? 'bg-primary text-white border-primary'
                      : active
                        ? 'bg-primary/10 text-primary border-primary/20 font-bold'
                        : 'bg-surface-container text-outline-variant border-outline-variant/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{statusIcons[step]}</span>
                </motion.div>
                <span
                  className={`text-[10px] font-bold uppercase mt-2 tracking-wider ${active ? 'text-on-surface' : 'text-secondary/60 font-medium'}`}
                >
                  {step}
                </span>
              </div>
              {idx < trackingSteps.length - 1 && (
                <div className="flex-1 h-[2px] bg-surface-container-highest relative -top-3">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: idx < activeIndex ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Vertical Timeline */}
      <div className="sm:hidden space-y-6 relative pl-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-highest">
        {trackingSteps.map((step, idx) => {
          const active =
            idx <= activeIndex &&
            orderStatus !== 'Cancelled' &&
            orderStatus !== 'Returned' &&
            orderStatus !== 'Refunded';
          const isCurrent = step === orderStatus;

          return (
            <div key={step} className="flex gap-4 items-center relative">
              <div
                className={`w-8 h-8 rounded-full z-10 flex items-center justify-center text-[16px] border ${
                  isCurrent
                    ? 'bg-primary text-white border-primary shadow'
                    : active
                      ? 'bg-primary/10 text-primary border-primary/20 font-bold'
                      : 'bg-surface-container text-outline-variant border-outline-variant/20'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{statusIcons[step]}</span>
              </div>
              <div>
                <h4
                  className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-on-surface' : 'text-secondary/60 font-medium'}`}
                >
                  {step}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
