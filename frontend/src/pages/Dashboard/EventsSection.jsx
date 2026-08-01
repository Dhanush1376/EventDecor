import { PartyPopper } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../../components/ui';
import { useDashboard } from '../../context/DashboardContext';

const EventCustomerDashboard = React.lazy(() =>
  import('../EventCustomerDashboard').then((m) => ({ default: m.EventCustomerDashboard })),
);

export function EventsSection() {
  const { selectedEventBookingId, setSelectedEventBookingId } = useDashboard();

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
      <div className="pb-4 mb-4 border-b border-outline-variant/20">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <PartyPopper className="text-[12px]" strokeWidth={1.5} />
          My Event Bookings
        </h2>
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
        <EventCustomerDashboard
          isEmbedded={true}
          selectedEventBookingId={selectedEventBookingId}
          setSelectedEventBookingId={setSelectedEventBookingId}
        />
      </React.Suspense>
    </motion.div>
  );
}
