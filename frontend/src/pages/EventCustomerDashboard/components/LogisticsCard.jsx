import { Truck, Wrench, Phone } from 'lucide-react';
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
          <Truck className="text-[14px]" strokeWidth={1.5} />
          Logistics & Team Details
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-secondary">
            <Wrench className="text-[16px]" strokeWidth={1.5} />
            <span className="text-[9px] uppercase tracking-widest font-bold">Setup Time</span>
          </div>
          <span className="text-[12px] text-on-surface font-semibold block">
            {selectedBooking.setupTiming
              ? new Date(selectedBooking.setupTiming).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'To Be Decided'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-secondary">
            <Truck className="text-[16px]" strokeWidth={1.5} />
            <span className="text-[9px] uppercase tracking-widest font-bold">Pickup Time</span>
          </div>
          <span className="text-[12px] text-on-surface font-semibold block">
            {selectedBooking.pickupTiming
              ? new Date(selectedBooking.pickupTiming).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'To Be Decided'}
          </span>
        </div>

        {selectedBooking.assignedTeam?.length > 0 && (
          <div className="sm:col-span-2 space-y-3 pt-4 border-t border-outline-variant/20 mt-2">
            <span className="text-[9px] uppercase tracking-widest text-secondary font-bold block">
              Your Event Team
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
                      <Phone className="text-[14px]" strokeWidth={1.5} />
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
