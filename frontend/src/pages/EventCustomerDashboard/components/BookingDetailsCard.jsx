export function BookingDetailsCard({ selectedBooking, setIsMobileChatOpen }) {
  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/40 p-6 space-y-6 shadow-xs relative overflow-hidden text-left">
      <div className="flex flex-col md:flex-row justify-between items-start border-b border-black/5 pb-5 gap-4 md:gap-0">
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">event_available</span>
            Booking Details
          </span>
          <h2 className="font-bold text-[18px] text-on-surface tracking-tight">
            {selectedBooking.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setIsMobileChatOpen(true)}
            className="lg:hidden flex items-center justify-center gap-1.5 bg-[#2A2927] hover:bg-black text-white px-4 py-2 rounded-[32px] font-bold text-[9px] uppercase tracking-widest shadow-sm cursor-pointer transition-colors border-0"
          >
            <span className="material-symbols-outlined text-[14px]">forum</span>
            Chat
          </button>
          <span className="bg-surface-bright border border-outline-variant/40 text-secondary px-4 py-2 rounded-[32px] font-bold text-[9px] uppercase tracking-widest shadow-sm flex items-center justify-center">
            ID: {selectedBooking._id?.substring(18).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
        <div className="space-y-1">
          <span className="text-[8px] font-bold uppercase tracking-widest text-secondary block">
            Event Style
          </span>
          <span className="text-on-surface font-semibold text-[11px] capitalize block">
            {selectedBooking.eventType}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[8px] font-bold uppercase tracking-widest text-secondary block">
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
          <span className="text-[8px] font-bold uppercase tracking-widest text-secondary block">
            Timing Window
          </span>
          <span className="text-on-surface font-semibold text-[11px] block">
            {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
          </span>
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-3 lg:col-span-2 bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/30">
          <span className="text-[8px] font-bold uppercase tracking-widest text-secondary block">
            Setup Destination Address
          </span>
          {selectedBooking.venue?.name && (
            <span className="text-on-surface font-bold text-[12px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">storefront</span>
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
                <span className="material-symbols-outlined text-[12px]">directions</span> Navigate
              </a>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[8px] font-bold uppercase tracking-widest text-secondary block">
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
