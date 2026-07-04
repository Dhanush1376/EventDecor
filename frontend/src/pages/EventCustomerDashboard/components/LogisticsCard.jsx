export function LogisticsCard({ selectedBooking }) {
  if (
    !selectedBooking.setupTiming &&
    !selectedBooking.pickupTiming &&
    !(selectedBooking.assignedTeam?.length > 0)
  ) {
    return null;
  }

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs text-left font-body">
      <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">local_shipping</span>
          Logistics & Crew Roster
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="material-symbols-outlined text-[16px]">build</span>
            <span className="text-[9px] uppercase tracking-widest font-bold">
              Decoration Setup Schedule
            </span>
          </div>
          <span className="text-[12px] text-on-surface font-semibold block">
            {selectedBooking.setupTiming
              ? new Date(selectedBooking.setupTiming).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Pending Logistics Finalization'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            <span className="text-[9px] uppercase tracking-widest font-bold">
              Prop Pickup & Disassembly
            </span>
          </div>
          <span className="text-[12px] text-on-surface font-semibold block">
            {selectedBooking.pickupTiming
              ? new Date(selectedBooking.pickupTiming).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Pending Logistics Finalization'}
          </span>
        </div>

        {selectedBooking.assignedTeam?.length > 0 && (
          <div className="sm:col-span-2 space-y-3 pt-4 border-t border-outline-variant/20 mt-2">
            <span className="text-[9px] uppercase tracking-widest text-secondary font-bold block">
              Assigned Setup Team
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedBooking.assignedTeam.map((team, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-surface-container-lowest border border-outline-variant/40 rounded-lg flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-on-surface font-bold block">{team.name}</span>
                    <span className="text-[9px] text-secondary font-medium block capitalize tracking-widest uppercase">
                      {team.role}
                    </span>
                  </div>
                  {team.contact && (
                    <a
                      href={`tel:${team.contact}`}
                      className="w-8 h-8 rounded-full border border-outline-variant/40 text-secondary flex items-center justify-center hover:bg-[#2A2927] hover:text-white hover:border-[#2A2927] transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
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
