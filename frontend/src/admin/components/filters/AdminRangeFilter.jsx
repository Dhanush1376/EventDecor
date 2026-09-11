import React from 'react';

/**
 * AdminRangeFilter
 * Dual numeric min/max range input.
 */
export function AdminRangeFilter({
  value = { min: '', max: '' },
  onChange,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  prefix = '',
  suffix = '',
  step = '1',
  min = '0',
}) {
  const handleMinChange = (e) => {
    onChange({
      ...value,
      min: e.target.value,
    });
  };

  const handleMaxChange = (e) => {
    onChange({
      ...value,
      max: e.target.value,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-2.5 text-[11px] font-semibold text-[var(--admin-text-tertiary)] pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          step={step}
          placeholder={minPlaceholder}
          value={value?.min ?? ''}
          onChange={handleMinChange}
          className={`w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] py-1.5 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] transition-colors focus:border-[var(--admin-accent)] ${
            prefix ? 'pl-6 pr-2' : 'px-2.5'
          } ${suffix ? 'pr-6' : ''}`}
        />
        {suffix && (
          <span className="absolute right-2 text-[10px] text-[var(--admin-text-tertiary)] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-2.5 text-[11px] font-semibold text-[var(--admin-text-tertiary)] pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          step={step}
          placeholder={maxPlaceholder}
          value={value?.max ?? ''}
          onChange={handleMaxChange}
          className={`w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] py-1.5 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] transition-colors focus:border-[var(--admin-accent)] ${
            prefix ? 'pl-6 pr-2' : 'px-2.5'
          } ${suffix ? 'pr-6' : ''}`}
        />
        {suffix && (
          <span className="absolute right-2 text-[10px] text-[var(--admin-text-tertiary)] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
