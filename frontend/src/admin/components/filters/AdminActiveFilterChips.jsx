import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

/**
 * Ultra-crisp micro close SVG icon (as small as you can get, pixel-sharp)
 */
function MicroCloseIcon({ className = 'w-2 h-2' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 2l6 6M8 2l-6 6" />
    </svg>
  );
}

/**
 * AdminActiveFilterChips
 * Ultra-compact, single-line active filter bar with:
 * - Direct inline alignment (no broken second-line wrapping)
 * - Micro-sized, pixel-sharp 'X' dismiss controls
 * - Synchronized 26px compact height
 * - Key / Value hierarchy
 */
export function AdminActiveFilterChips({
  activeChips = [],
  totalCount,
  matchCount,
  totalItems,
  totalMatches,
  onClearAll,
  itemName = 'items',
  className = '',
}) {
  const resolvedMatchCount = matchCount ?? totalMatches ?? 0;
  const resolvedTotalCount = totalCount ?? totalItems ?? 0;
  const hasActiveChips = Array.isArray(activeChips) && activeChips.length > 0;
  const isFiltered = resolvedMatchCount < resolvedTotalCount || hasActiveChips;

  if (!isFiltered && !hasActiveChips) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.12 }}
        className={`w-full overflow-hidden ${className}`}
      >
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 py-1.5 text-xs">
          {/* Match Counter Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 h-[26px] rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-2xs text-[11px] text-[var(--admin-text-secondary)] shrink-0 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              Showing{' '}
              <strong className="text-[var(--admin-text-primary)] font-bold">
                {resolvedMatchCount}
              </strong>{' '}
              of {resolvedTotalCount} {itemName}
            </span>
          </div>

          {/* Subtle Vertical Divider */}
          {hasActiveChips && (
            <div className="w-[1px] h-3 bg-[var(--admin-border)] shrink-0 mx-0.5" />
          )}

          {/* Active Filter Chips — direct flex children so they sit inline */}
          {hasActiveChips &&
            activeChips.map((chip) => {
              const label = chip.label || '';
              const colonIdx = label.indexOf(':');
              const hasPrefix = colonIdx !== -1;
              const prefix = hasPrefix ? label.slice(0, colonIdx).trim() : '';
              const value = hasPrefix ? label.slice(colonIdx + 1).trim() : label;

              return (
                <motion.div
                  key={chip.id || chip.key || chip.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="h-[26px] inline-flex items-center gap-1.5 pl-2.5 pr-1 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] hover:border-[var(--admin-accent)] text-[var(--admin-text-primary)] shadow-2xs transition-all group shrink-0"
                >
                  {hasPrefix ? (
                    <span className="inline-flex items-center gap-1 text-[11px] truncate max-w-[220px] sm:max-w-[280px]">
                      <span className="text-[9.5px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                        {prefix}
                      </span>
                      <span className="font-semibold text-[var(--admin-text-primary)]">
                        {value}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[var(--admin-text-primary)] truncate max-w-[220px] sm:max-w-[280px]">
                      {label}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      chip.onRemove?.();
                    }}
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
                    title={`Remove filter: ${label}`}
                  >
                    <MicroCloseIcon className="w-2 h-2 text-rose-500" />
                  </button>
                </motion.div>
              );
            })}

          {/* Inline Clear All Action — X positioned on the RIGHT side in red */}
          {hasActiveChips && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-[26px] inline-flex items-center gap-1 pl-2 pr-1.5 rounded-full text-[11px] font-semibold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] transition-colors cursor-pointer shrink-0 group"
              title="Clear all active filters"
            >
              <span>Clear all</span>
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-rose-500 group-hover:text-rose-600 transition-colors">
                <MicroCloseIcon className="w-2 h-2 text-rose-500" />
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
