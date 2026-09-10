import React from 'react';

export function BookingLogisticsCard({
  booking,
  teamMembers,
  allocatedTeam,
  onTeamMemberToggle,
  logisticsSetup,
  setLogisticsSetup,
  logisticsPickup,
  setLogisticsPickup,
  drawerNotes,
  setDrawerNotes,
  onSaveLogistics,
  quoteRental,
  setQuoteRental,
  quoteSetup,
  setQuoteSetup,
  quoteTransport,
  setQuoteTransport,
  quoteAddons,
  setQuoteAddons,
  onUpdateQuotation,
}) {
  return (
    <div
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden font-sans"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
            engineering
          </span>
          Operations, Staff & Quotation
        </h3>
        <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
          {allocatedTeam.length} Assigned Staff
        </span>
      </div>

      <div className="p-4 sm:p-5 lg:p-6 space-y-6">
        {/* Setup & Pickup Timing Form */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
            Execution Timings
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[var(--admin-text-tertiary)] block">
                Setup Timing Arrival
              </span>
              <input
                type="datetime-local"
                value={logisticsSetup}
                onChange={(e) => setLogisticsSetup(e.target.value)}
                className="w-full h-9 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] text-[12.5px] outline-none focus:border-[var(--admin-accent)] shadow-2xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[var(--admin-text-tertiary)] block">
                Tear-Down / Pickup Timing
              </span>
              <input
                type="datetime-local"
                value={logisticsPickup}
                onChange={(e) => setLogisticsPickup(e.target.value)}
                className="w-full h-9 px-3 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[var(--admin-text-primary)] text-[12.5px] outline-none focus:border-[var(--admin-accent)] shadow-2xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Staff Allocation Checklist */}
        <div className="space-y-3 pt-4 border-t border-[var(--admin-border-subtle)]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
              Staff & Coordinator Roster
            </label>
            <span className="text-[11px] text-[var(--admin-text-tertiary)]">
              Click to assign/unassign
            </span>
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-[12px] text-[var(--admin-text-tertiary)] italic p-3 bg-[var(--admin-surface-muted)] rounded-[4px] text-center">
              No staff members found. Add team members in Settings &bull; Team.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {teamMembers.map((member, idx) => {
                const isAssigned = allocatedTeam.some((t) => t.name === member.name);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onTeamMemberToggle(member.name, member.role, member.contact)}
                    className={`flex items-center justify-between p-2.5 rounded-[4px] border text-left transition-all cursor-pointer ${
                      isAssigned
                        ? 'bg-amber-500/10 border-amber-500/30 text-[var(--admin-text-primary)] shadow-xs'
                        : 'bg-white dark:bg-[#1a1815] border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`material-symbols-outlined text-[18px] shrink-0 ${
                          isAssigned ? 'text-[var(--admin-accent)]' : 'text-stone-400'
                        }`}
                      >
                        {isAssigned ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <div className="truncate">
                        <span className="text-[12.5px] font-bold block truncate leading-tight">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold block mt-0.5">
                          {member.role} &bull; {member.contact}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quotation / Price Estimate Editor */}
        <div className="space-y-3 pt-4 border-t border-[var(--admin-border-subtle)]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
              Quotation & Price Estimation
            </label>
            <button
              type="button"
              onClick={onUpdateQuotation}
              className="h-7 px-2.5 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[11px] font-bold text-[var(--admin-text-primary)] shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">send</span>
              Update Estimate
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <span className="text-[10.5px] font-medium text-[var(--admin-text-tertiary)] block">
                Rental Fee (₹)
              </span>
              <input
                type="number"
                value={quoteRental}
                onChange={(e) => setQuoteRental(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[13px] font-mono font-bold outline-none focus:border-[var(--admin-accent)] shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] font-medium text-[var(--admin-text-tertiary)] block">
                Setup Charges (₹)
              </span>
              <input
                type="number"
                value={quoteSetup}
                onChange={(e) => setQuoteSetup(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[13px] font-mono font-bold outline-none focus:border-[var(--admin-accent)] shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] font-medium text-[var(--admin-text-tertiary)] block">
                Transport Cost (₹)
              </span>
              <input
                type="number"
                value={quoteTransport}
                onChange={(e) => setQuoteTransport(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[13px] font-mono font-bold outline-none focus:border-[var(--admin-accent)] shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] font-medium text-[var(--admin-text-tertiary)] block">
                Add-Ons (₹)
              </span>
              <input
                type="number"
                value={quoteAddons}
                onChange={(e) => setQuoteAddons(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[13px] font-mono font-bold outline-none focus:border-[var(--admin-accent)] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Admin Operations Notes */}
        <div className="space-y-2 pt-4 border-t border-[var(--admin-border-subtle)]">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
            Internal Operations & Crew Notes
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Special flower arrangements required; ladder needed on-site; contact venue manager Mr. Rao..."
            value={drawerNotes}
            onChange={(e) => setDrawerNotes(e.target.value)}
            className="w-full p-2.5 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[12.5px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] shadow-2xs resize-y"
          />
        </div>

        {/* Save Logistics Action Button */}
        <button
          type="button"
          onClick={onSaveLogistics}
          className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white text-[13px] font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Save Rosters, Timelines & Venue Logistics</span>
        </button>
      </div>
    </div>
  );
}
