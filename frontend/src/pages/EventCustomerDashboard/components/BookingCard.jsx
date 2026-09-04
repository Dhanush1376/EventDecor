import { PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatusPill, OptimizedImage } from '../../../components/ui';
import { STATUS_STEPS } from '../constants';

const getPhaseIndex = (status) => {
  switch (status) {
    case 'inquiry':
      return 0;
    case 'booking':
    case 'draft':
    case 'quotation_sent':
    case 'pending_payment':
    case 'advance_payment':
    case 'payment_processing':
      return 1;
    case 'confirmed':
    case 'material_planning':
    case 'production':
    case 'packing':
    case 'dispatch':
      return 2;
    case 'team_assigned':
    case 'setup_in_progress':
    case 'execution':
      return 3;
    case 'final_settlement':
    case 'completed':
      return 4;
    default:
      return 0;
  }
};

export function BookingCard({ booking, idx, onClick }) {
  const eventDate = new Date(booking.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const eventImage =
    booking.inspirationImages?.[0] ||
    (booking.eventPackage && typeof booking.eventPackage === 'object'
      ? booking.eventPackage.image
      : null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      onClick={onClick}
      className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs hover:border-outline-variant hover:shadow-xs transition-all text-left cursor-pointer group"
    >
      {/* Card Header */}
      <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
        <div className="flex items-center gap-2">
          {booking.status?.toLowerCase() === 'completed' ? (
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
          ) : (
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
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
            {STATUS_STEPS[getPhaseIndex(booking.status)]?.label ||
              booking.status?.replace('_', ' ') ||
              'Confirmed'}
          </span>
          <span className="text-[9px] text-secondary font-light">on {eventDate}</span>
        </div>
        <StatusPill
          color="accent"
          className="capitalize max-w-[110px] sm:max-w-[140px] truncate inline-block"
        >
          {booking.eventType?.replace(/-/g, ' ')}
        </StatusPill>
      </div>

      {/* Card Body - Item Container */}
      <div className="p-4 flex gap-4 items-center">
        {eventImage ? (
          <OptimizedImage
            src={eventImage}
            alt={booking.title}
            containerClassName="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs overflow-hidden"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
            <PartyPopper className="text-[32px]" strokeWidth={1.5} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <span className="text-[9px] uppercase font-bold text-primary tracking-widest block font-label">
            Event Setup
          </span>
          <h4 className="font-display font-medium text-on-surface text-[12px] truncate">
            {booking.title}
          </h4>
          <p className="text-secondary text-[10px] font-light font-body truncate">
            Venue:{' '}
            <span className="font-medium text-on-surface">{booking.venue?.name || 'Pending'}</span>
          </p>
          <div className="flex items-center gap-1.5 pt-0.5 font-body">
            <span className="text-[10px] text-secondary font-light">
              Timing:{' '}
              <span className="font-medium text-on-surface">
                {booking.timing?.start} - {booking.timing?.end}
              </span>
            </span>
          </div>
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

      {/* Event Details Footer Block */}
      <div className="px-4 py-2 bg-surface-container-low/40 border-t border-outline-variant/15 flex items-center justify-between text-[10px] text-secondary font-body">
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-secondary/70 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span className="truncate max-w-[200px] sm:max-w-none">
            {booking.venue?.address || 'Location pending finalization'}
          </span>
        </div>
        <span className="font-mono text-[9px] font-medium opacity-60">
          ID: {(booking._id || booking.id || '').substring(18).toUpperCase()}
        </span>
      </div>
    </motion.div>
  );
}
