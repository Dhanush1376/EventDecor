import React from 'react';

const PHASES = [
  {
    key: 'inquiry',
    number: 1,
    title: 'Inquiry',
    desc: 'Initial customer inquiry received',
    icon: 'chat_bubble',
    color: 'amber',
  },
  {
    key: 'pending_payment',
    number: 2,
    title: 'Booking & Payment',
    desc: 'Quotation sent; awaiting customer payment',
    icon: 'payments',
    color: 'blue',
  },
  {
    key: 'confirmed',
    number: 3,
    title: 'Confirmed & Planning',
    desc: 'Deposit received; event date & team locked',
    icon: 'event_available',
    color: 'indigo',
  },
  {
    key: 'setup_in_progress',
    number: 4,
    title: 'Setup & Execution',
    desc: 'Team dispatched; on-site decoration underway',
    icon: 'construction',
    color: 'purple',
  },
  {
    key: 'completed',
    number: 5,
    title: 'Completed',
    desc: 'Event completed & tear-down inventory returned',
    icon: 'task_alt',
    color: 'emerald',
  },
];

export function BookingStatusTimeline({ booking, onUpdateStatus, setShowUnpaidModal }) {
  const currentStatus = booking.status || 'inquiry';
  const currentIdx = PHASES.findIndex((p) => p.key === currentStatus);
  const safeIdx = currentIdx === -1 ? 0 : currentIdx;

  const handleAdvance = (targetStatus) => {
    if (targetStatus === 'confirmed' && booking?.pricing?.paymentStatus === 'unpaid') {
      setShowUnpaidModal(true);
      return;
    }
    onUpdateStatus(targetStatus);
  };

  const nextPhase = safeIdx < PHASES.length - 1 ? PHASES[safeIdx + 1] : null;

  return (
    <div
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden font-sans"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Card Header */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
            timeline
          </span>
          <div className="flex flex-col min-w-0">
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight whitespace-nowrap">
              Lifecycle Progression
            </h3>
            <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium hidden sm:block">
              Phase {safeIdx + 1} of {PHASES.length}: {PHASES[safeIdx]?.title}
            </p>
          </div>
        </div>

        {/* Advance Next Phase Action */}
        {nextPhase && (
          <button
            type="button"
            onClick={() => handleAdvance(nextPhase.key)}
            className="h-8 px-2.5 sm:px-3 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white text-[11px] font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">Advance to {nextPhase.title}</span>
            <span className="sm:hidden">Next: {nextPhase.title.split(' ')[0]}</span>
            <span className="material-symbols-outlined text-[14px] shrink-0">arrow_forward</span>
          </button>
        )}
      </div>

      {/* Stepper Progress Bar */}
      <div className="p-4 sm:p-5">
        <div className="relative">
          {/* Progress Connecting Line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-stone-200 dark:bg-stone-700 hidden sm:block">
            <div
              className="h-full bg-[var(--admin-accent)] transition-all duration-500"
              style={{
                width: `${(safeIdx / (PHASES.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2 relative z-10">
            {PHASES.map((phase, idx) => {
              const isPast = idx < safeIdx;
              const isCurrent = idx === safeIdx;
              const isFuture = idx > safeIdx;

              return (
                <div
                  key={phase.key}
                  onClick={() => handleAdvance(phase.key)}
                  className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-1.5 p-2 sm:p-1.5 rounded-[4px] transition-colors cursor-pointer group ${
                    isCurrent
                      ? 'bg-amber-500/5 dark:bg-amber-500/10'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Step Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isPast
                        ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]'
                        : isCurrent
                          ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] ring-4 ring-amber-500/20 shadow-xs'
                          : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)]'
                    }`}
                  >
                    {isPast ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">{phase.icon}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="flex-1 sm:flex-none min-w-0">
                    <span
                      className={`text-[11.5px] font-bold block leading-tight truncate ${
                        isCurrent
                          ? 'text-[var(--admin-accent)] font-bold'
                          : isPast
                            ? 'text-[var(--admin-text-primary)]'
                            : 'text-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      {phase.title}
                    </span>
                    <span className="text-[10px] text-[var(--admin-text-secondary)] hidden sm:block truncate mt-0.5">
                      {isCurrent ? 'Current Phase' : isPast ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Phase Context Box */}
        <div className="mt-4 p-3 bg-[var(--admin-surface-muted)] dark:bg-[#201e19] rounded-[4px] border border-[var(--admin-border-subtle)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[var(--admin-text-secondary)] font-medium">Current Stage:</span>
            <span className="font-bold text-[var(--admin-text-primary)]">
              {PHASES[safeIdx]?.title}
            </span>
            <span className="text-stone-400 hidden sm:inline">&bull;</span>
            <span className="text-[var(--admin-text-tertiary)] hidden sm:inline">
              {PHASES[safeIdx]?.desc}
            </span>
          </div>

          <span className="text-[11px] font-mono text-[var(--admin-text-secondary)]">
            Stage {safeIdx + 1} / 5
          </span>
        </div>
      </div>
    </div>
  );
}
