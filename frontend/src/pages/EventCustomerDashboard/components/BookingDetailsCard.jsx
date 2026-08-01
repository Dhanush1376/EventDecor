import { CalendarCheck, MessageSquare, Store, Navigation } from 'lucide-react';
export function BookingDetailsCard({ selectedBooking, setIsMobileChatOpen }) {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs text-left font-body">
      <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <CalendarCheck className="text-[14px]" strokeWidth={1.5} />
          Booking Details
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileChatOpen(true)}
            className="lg:hidden flex items-center justify-center gap-1.5 text-primary hover:text-on-surface transition-colors border-0 bg-transparent"
          >
            <MessageSquare className="text-[14px]" strokeWidth={1.5} />
            <span className="text-[9px] uppercase tracking-widest font-bold">Chat</span>
          </button>
          <span className="text-[9px] text-secondary font-mono tracking-wider">
            ID: {(selectedBooking._id || selectedBooking.id || '').substring(18).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
            Event Style
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
            Timing Window
          </span>
          <span className="text-on-surface font-semibold text-[11px] block">
            {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
          </span>
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-3 lg:col-span-2 bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/20">
          <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
            Setup Destination Address
          </span>
          {selectedBooking.venue?.name && (
            <span className="text-on-surface font-bold text-[12px] flex items-center gap-1.5">
              <Store className="text-[14px]" strokeWidth={1.5} />
              {selectedBooking.venue.name}
            </span>
          )}
          <span className="text-[11px] text-secondary font-medium block leading-relaxed">
            {selectedBooking.venue?.address || 'Address pending finalization'}
          </span>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {selectedBooking.venue?.city && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-surface-bright border border-outline-variant/30 px-2.5 py-1 rounded-[32px]">
                {selectedBooking.venue.city}
              </span>
            )}
            {selectedBooking.venue?.pincode && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-secondary bg-surface-bright border border-outline-variant/30 px-2.5 py-1 rounded-[32px]">
                {selectedBooking.venue.pincode}
              </span>
            )}
            {selectedBooking.venue?.googleMapsLink && (
              <a
                href={selectedBooking.venue.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-bold uppercase tracking-widest text-on-surface hover:text-[#2A2927] hover:underline flex items-center gap-1 ml-auto"
              >
                <Navigation className="text-[12px]" strokeWidth={1.5} /> Navigate
              </a>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-secondary block font-medium">
            Setup Type
          </span>
          <span className="text-on-surface font-semibold text-[11px] block">
            {selectedBooking.venue?.isOutdoor ? 'Outdoor Lawn' : 'Indoor Banquet'}
          </span>
        </div>
      </div>
    </div>
  );
}
