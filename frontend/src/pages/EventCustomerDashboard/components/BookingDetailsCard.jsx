export function BookingDetailsCard({ selectedBooking, setIsMobileChatOpen }) {
  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs relative overflow-hidden text-[11px]">
      <div className="flex flex-col md:flex-row justify-between items-start border-b border-black/5 pb-4 gap-4 md:gap-0">
        <div>
          <span className="font-label text-[9px] text-primary uppercase tracking-[0.2em] font-bold block mb-1">
            Booking Details
          </span>
          <h2 className="font-display text-[22px] text-black font-light tracking-tight">
            {selectedBooking.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setIsMobileChatOpen(true)}
            className="lg:hidden flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg font-label text-[9px] uppercase tracking-wider font-bold shadow-md active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px]">forum</span>
            Chat
          </button>
          <span className="bg-stone-100 text-stone-700 px-3 py-2 rounded-full font-label text-[9px] uppercase tracking-widest font-bold">
            ID: {selectedBooking._id?.substring(18).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
        <div className="space-y-0.5">
          <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
            Event Style
          </span>
          <span className="font-body text-xs text-black font-bold capitalize">
            {selectedBooking.eventType}
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
            Event Date
          </span>
          <span className="font-body text-xs text-black font-bold">
            {new Date(selectedBooking.date).toLocaleDateString('en-IN', {
              weekday: 'short',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
            Timing Window
          </span>
          <span className="font-body text-xs text-black font-semibold">
            {selectedBooking.timing?.start} - {selectedBooking.timing?.end}
          </span>
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-3 lg:col-span-2 bg-primary/5 p-4 rounded-lg border border-primary/10 relative overflow-hidden">
          <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block mb-1">
            Setup Destination Address
          </span>
          {selectedBooking.venue?.name && (
            <span className="font-display text-xs text-on-surface font-bold flex items-center gap-1.5 leading-none">
              <span className="material-symbols-outlined text-primary text-[16px]">storefront</span>
              {selectedBooking.venue.name}
            </span>
          )}
          <span className="font-body text-[11px] text-secondary font-light block leading-relaxed">
            {selectedBooking.venue?.address || 'Address pending finalization'}
          </span>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {selectedBooking.venue?.city && (
              <span className="font-body text-[9px] text-secondary font-semibold bg-surface-container px-2 py-0.5 rounded-full">
                City: {selectedBooking.venue.city}
              </span>
            )}
            {selectedBooking.venue?.pincode && (
              <span className="font-body text-[9px] text-secondary font-semibold bg-surface-container px-2 py-0.5 rounded-full">
                Pincode: {selectedBooking.venue.pincode}
              </span>
            )}
            {selectedBooking.venue?.googleMapsLink && (
              <a
                href={selectedBooking.venue.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-[8px] uppercase tracking-wider text-primary font-bold hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[12px]">directions</span> Open
                Navigation
              </a>
            )}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
            Setup Type
          </span>
          <span className="font-body text-xs text-black font-bold">
            {selectedBooking.venue?.isOutdoor ? '🍀 Outdoor Lawn' : '🏛️ Indoor Banquet'}
          </span>
        </div>
      </div>
    </div>
  );
}
