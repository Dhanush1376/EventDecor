import React from 'react';

const EventCustomerDashboard = React.lazy(() =>
  import('../EventCustomerDashboard').then((m) => ({ default: m.EventCustomerDashboard })),
);

export function EventsSection() {
  return (
    <motion.div
      id="panel-bookings"
      role="tabpanel"
      key="tab-bookings"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-left"
    >
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-1 shadow-2xs">
        <h2 className="font-semibold text-sm text-on-surface tracking-wide">My Event Bookings</h2>
        <span className="text-[10px] text-on-surface/60 font-light">
          Track your reserved setups, theme boards, milestone deposits, and site lead coordinates.
        </span>
      </div>
      <React.Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="p-5 rounded-lg bg-surface-bright border border-outline-variant/30 shadow-2xs space-y-4"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        }
      >
        <EventCustomerDashboard isEmbedded={true} />
      </React.Suspense>
    </motion.div>
  );
}
