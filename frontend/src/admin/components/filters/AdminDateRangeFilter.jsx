import React from 'react';

/**
 * AdminDateRangeFilter
 * Dual date picker inputs for custom date windows.
 */
export function AdminDateRangeFilter({
  value = { from: '', to: '' },
  onChange,
  fromPlaceholder = 'Start Date',
  toPlaceholder = 'End Date',
}) {
  const handleFromChange = (e) => {
    onChange({
      ...value,
      from: e.target.value,
    });
  };

  const handleToChange = (e) => {
    onChange({
      ...value,
      to: e.target.value,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2 pt-0.5">
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] block">
          From
        </span>
        <input
          type="date"
          value={value?.from ?? ''}
          onChange={handleFromChange}
          placeholder={fromPlaceholder}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] font-medium outline-none text-[var(--admin-text-primary)] transition-colors focus:border-[var(--admin-accent)]"
        />
      </div>
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] block">
          To
        </span>
        <input
          type="date"
          value={value?.to ?? ''}
          onChange={handleToChange}
          placeholder={toPlaceholder}
          className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-2 py-1.5 text-[11px] font-medium outline-none text-[var(--admin-text-primary)] transition-colors focus:border-[var(--admin-accent)]"
        />
      </div>
    </div>
  );
}
