export function LogisticsCard({ selectedBooking }) {
  if (
    !selectedBooking.setupTiming &&
    !selectedBooking.pickupTiming &&
    !(selectedBooking.assignedTeam?.length > 0)
  ) {
    return null;
  }

  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs text-[11px]">
      <h3 className="font-display text-lg text-black font-bold border-b border-black/5 pb-2">
        Logistics & Crew Roster
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[18px]">build</span>
            <span className="font-label text-[9px] uppercase tracking-wider font-bold">
              Decoration Setup Schedule
            </span>
          </div>
          <span className="font-body text-xs text-stone-700 font-bold block">
            {selectedBooking.setupTiming
              ? new Date(selectedBooking.setupTiming).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Pending Logistics Finalization'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            <span className="font-label text-[9px] uppercase tracking-wider font-bold">
              Prop Pickup & Disassembly
            </span>
          </div>
          <span className="font-body text-xs text-stone-700 font-bold block">
            {selectedBooking.pickupTiming
              ? new Date(selectedBooking.pickupTiming).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Pending Logistics Finalization'}
          </span>
        </div>

        {selectedBooking.assignedTeam?.length > 0 && (
          <div className="sm:col-span-2 space-y-3 pt-2">
            <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
              Assigned Setup Team
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedBooking.assignedTeam.map((team, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-surface-container border border-outline-variant/20 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <span className="font-body text-xs text-black font-bold block">
                      {team.name}
                    </span>
                    <span className="font-body text-[10px] text-black/40 block capitalize">
                      {team.role}
                    </span>
                  </div>
                  {team.contact && (
                    <a
                      href={`tel:${team.contact}`}
                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
