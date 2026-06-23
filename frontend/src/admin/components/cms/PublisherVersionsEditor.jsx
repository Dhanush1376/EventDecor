import React from 'react';
import { SectionHeader } from '../AdminUIKit';
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
    <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
      <SectionHeader
        icon="history"
        title="Version Rollback Vault"
        description="Quickly restore previously published storefront layouts and restore visual snapshots"
      />
      <div className="space-y-4">
        {versions.map((v) => (
          <div
            key={v.id}
            className="p-4.5 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex items-center justify-between gap-4.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
          >
            <div className="space-y-1">
              <span className="text-[7.5px] bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] font-semibold px-2.5 py-0.5 rounded-full font-mono w-fit block shadow-[var(--admin-shadow-xs)]">
                {v.tag}
              </span>
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] mt-2 block leading-none">
                {v.desc}
              </span>
              <span className="text-[11px] text-[var(--admin-text-tertiary)] block mt-1">
                {v.time}
              </span>
            </div>
            <button
              onClick={() => toast.success(`Rolled back to ${v.tag}!`)}
              className="px-4 py-2 rounded-xl text-[11px] sm:text-[11px] sm:text-[11px] font-semibold border border-[var(--admin-border)] hover:border-[var(--admin-accent)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer shadow-[var(--admin-shadow-xs)] transition-all active:scale-95"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
