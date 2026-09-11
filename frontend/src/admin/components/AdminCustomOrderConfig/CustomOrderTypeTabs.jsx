import React from 'react';

export function CustomOrderTypeTabs({ config, activeTypeTab, setActiveTypeTab }) {
  const getTypeIcon = (id) => {
    switch (id) {
      case 'product':
        return 'inventory_2';
      case 'general':
        return 'tune';
      default:
        return 'dashboard_customize';
    }
  };

  return (
    <div className="w-full sm:w-fit bg-[var(--admin-surface-muted)] p-1 rounded-[6px] border border-[var(--admin-border)] shadow-xs flex items-center gap-1">
      {config.types?.map((t) => {
        let displayName = 'Custom';
        if (t.id === 'product') {
          displayName = 'Products';
        } else if (t.id === 'general') {
          displayName = 'General';
        } else if (t.name) {
          displayName = t.name.replace(/Customization|Custom Order|Custom/gi, '').trim() || t.name;
        }
        const isActive = activeTypeTab === t.id;
        const stepCount = t.steps?.length || 0;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTypeTab(t.id)}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-[4px] text-[12px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer select-none whitespace-nowrap ${
              isActive
                ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs font-bold'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)]/50'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
              }`}
            >
              {getTypeIcon(t.id)}
            </span>
            <span>{displayName}</span>
            {stepCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  isActive
                    ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]'
                    : 'bg-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)]'
                }`}
              >
                {stepCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
