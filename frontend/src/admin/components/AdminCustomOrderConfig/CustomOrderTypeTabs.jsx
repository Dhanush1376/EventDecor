import React from 'react';

export function CustomOrderTypeTabs({ config, activeTypeTab, setActiveTypeTab }) {
  return (
    <div className="inline-flex items-center gap-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 w-fit max-w-full overflow-x-auto scrollbar-hide">
      {config.types?.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setActiveTypeTab(t.id)}
          className={`shrink-0 px-3.5 py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center justify-center ${
            activeTypeTab === t.id
              ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
