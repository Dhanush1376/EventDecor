import { CalendarCheck, MessageSquare, MapPin, PartyPopper } from 'lucide-react';
import { OptimizedImage } from '../../../components/ui';

export function BookingDetailsCard({ selectedBooking, currentStatusIndex }) {
  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hi, I need assistance with my event booking (ID: ${selectedBooking._id || selectedBooking.id})`,
    );
    window.open(`https://wa.me/919866006648?text=${msg}`, '_blank');
  };

  const eventImage =
    selectedBooking.inspirationImages?.[0] ||
    (selectedBooking.eventPackage && typeof selectedBooking.eventPackage === 'object'
      ? selectedBooking.eventPackage.image
      : null);

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs text-left font-body">
      <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <CalendarCheck className="text-[14px]" strokeWidth={1.5} />
          Booking Details
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-secondary font-mono tracking-wider bg-surface-container-lowest px-2 py-1 rounded border border-outline-variant/40">
            ID: {(selectedBooking._id || selectedBooking.id || '').substring(18).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex gap-4 items-center mb-6">
        {eventImage ? (
          <OptimizedImage
            src={eventImage}
            alt={selectedBooking.title}
            containerClassName="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs overflow-hidden"
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="w-16 h-20 rounded-lg bg-surface-container border border-outline-variant/20 flex-shrink-0 shadow-3xs flex items-center justify-center text-primary/40 hover:text-primary transition-colors">
            <PartyPopper className="text-[32px]" strokeWidth={1.5} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <span className="text-[9px] uppercase font-bold text-primary tracking-widest block font-label">
            Event Setup
          </span>
          <h4 className="font-display font-medium text-on-surface text-[12px] truncate">
            {selectedBooking.title}
          </h4>
          <p className="text-secondary text-[10px] font-light font-body truncate">
            Venue:{' '}
            <span className="font-medium text-on-surface">
              {selectedBooking.venue?.name || 'Pending'}
            </span>
          </p>
          <div className="flex items-center gap-1.5 pt-0.5 font-body">
            <span className="text-[10px] text-secondary font-light">
              Timing:{' '}
              <span className="font-medium text-on-surface">
                {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
              </span>
            </span>
          </div>
        </div>

        <svg
          className="w-4 h-4 text-secondary hover:text-primary transition-colors pr-1 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
              Event Type
            </span>
            <span className="text-on-surface font-semibold text-[11px] capitalize block">
              {selectedBooking.eventType}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
              Event Date
            </span>
            <span className="text-on-surface font-semibold text-[11px] block">
              {new Date(selectedBooking.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
              Event Time
            </span>
            <span className="text-on-surface font-semibold text-[11px] block">
              {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
              Venue Type
            </span>
            <span className="text-on-surface font-semibold text-[11px] block">
              {selectedBooking.venue?.isOutdoor ? 'Outdoor Lawn' : 'Indoor Banquet'}
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden w-full bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/20">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="space-y-3">
              <span className="text-[9px] uppercase tracking-widest text-secondary block font-bold flex items-center gap-1.5">
                <MapPin className="text-[12px]" strokeWidth={2} />
                Event Venue
              </span>

              <div>
                {selectedBooking.venue?.name && (
                  <span className="text-on-surface font-bold text-[14px] block mb-1 leading-tight">
                    {selectedBooking.venue.name}
                  </span>
                )}
                <span className="text-[11px] text-secondary font-medium block leading-relaxed max-w-[95%]">
                  {selectedBooking.venue?.address || 'Address pending finalization'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedBooking.venue?.city && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-surface-bright border border-outline-variant/40 px-2.5 py-1 rounded-md">
                    {selectedBooking.venue.city}
                  </span>
                )}
                {selectedBooking.venue?.pincode && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-surface-bright border border-outline-variant/40 px-2.5 py-1 rounded-md">
                    {selectedBooking.venue.pincode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-secondary block font-bold mb-1">
            Need Assistance?
          </span>
          <span className="text-[11px] text-on-surface font-medium block">
            Our team is available to help with your booking details.
          </span>
        </div>
        <button
          onClick={handleWhatsApp}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-[32px] font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
        >
          <MessageSquare className="text-[14px]" strokeWidth={2} />
          Chat on WhatsApp
        </button>
      </div>
    </div>
  );
}
