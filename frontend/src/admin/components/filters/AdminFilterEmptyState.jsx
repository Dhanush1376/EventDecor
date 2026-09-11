import React from 'react';

/**
 * AdminFilterEmptyState
 * Consistent zero-results state for filtered tables and grids.
 */
export function AdminFilterEmptyState({
  onReset,
  title = 'No Matching Records',
  description = 'No records match your active filters or search criteria. Try clearing some filters to broaden your results.',
  icon = 'search_off',
  resetLabel = 'Clear All Filters',
  className = '',
}) {
  return (
    <div
      className={`admin-card flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface)] my-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[26px]">{icon}</span>
      </div>
      <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)] mb-1">{title}</h3>
      <p className="text-[12.5px] text-[var(--admin-text-secondary)] max-w-md mb-4 leading-relaxed">
        {description}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="admin-btn admin-btn-primary text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
          <span>{resetLabel}</span>
        </button>
      )}
    </div>
  );
}
