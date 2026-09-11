import React from 'react';
import toast from 'react-hot-toast';

export function PublisherVersionsEditor() {
  const versions = [
    {
      id: 4,
      tag: 'v2.4',
      desc: 'Pre-Diwali Launch Curation - by Sirisha',
      time: 'May 17, 2026 19:30',
    },
    {
      id: 3,
      tag: 'v2.3',
      desc: 'Summer Wedding Collections - by Balaji',
      time: 'May 10, 2026 14:15',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">history</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Published Visual Snapshots
          </span>

          <div className="space-y-4">
            {versions.map((v) => (
              <div
                key={v.id}
                className="p-5 bg-[var(--admin-surface-muted)]/70 hover:bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border)] flex items-center justify-between gap-4.5 shadow-2xs transition-all duration-300"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] font-bold px-2.5 py-0.5 rounded-[4px] font-mono w-fit block border border-[var(--admin-accent)]/20 shadow-2xs">
                    {v.tag}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block leading-snug">
                    {v.desc}
                  </span>
                  <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                    {v.time}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toast.success(`Rolled back to ${v.tag}!`)}
                  className="h-9 px-3.5 rounded-[4px] text-[12px] font-bold border border-[var(--admin-border)] hover:border-[var(--admin-accent)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent)] cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
