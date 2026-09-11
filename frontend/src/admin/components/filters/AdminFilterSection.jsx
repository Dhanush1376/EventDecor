import React from 'react';

/**
 * AdminFilterSection
 * Standardized section wrapper for filter drawers with header, optional active dot, and children.
 */
export function AdminFilterSection({ title, subtitle, active = false, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
            {title}
          </label>
          {active && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-pulse" />
          )}
        </div>
      )}
      {subtitle && (
        <p className="text-[11px] text-[var(--admin-text-tertiary)] -mt-0.5 mb-1.5">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
