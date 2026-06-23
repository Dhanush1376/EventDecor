export function BookingList({ bookings, selectedBooking, handleSelectBooking }) {
  if (bookings.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">
        Your Celebrations
      </h3>
      <div className="flex flex-row gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar">
        {bookings.map((b) => {
          const isSelected = selectedBooking?._id === b._id;
          return (
            <div
              key={b._id || b.id}
              onClick={() => handleSelectBooking(b)}
              className={`flex-shrink-0 min-w-[240px] md:min-w-[280px] p-4 rounded-lg border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-surface-bright border-primary shadow-2xs ring-1 ring-primary/20 scale-[1.01]'
                  : 'border-outline-variant/30 hover:border-outline-variant bg-surface-bright/70'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="bg-primary/5 text-primary px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold truncate">
                    {b.eventType}
                  </span>
                  <span className="font-mono text-[9px] text-black/35 shrink-0">
                    {new Date(b.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h4 className="font-display text-[13px] text-black font-bold truncate leading-tight">
                  {b.title}
                </h4>
                <div className="flex justify-between items-center text-[10px] pt-1 border-t border-black/5">
                  <span className="text-black/40">Status:</span>
                  <span className="font-semibold text-primary capitalize">
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
