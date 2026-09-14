import React from 'react';
import X from 'lucide-react/dist/esm/icons/x';

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    let d;
    if (typeof dateVal === 'string') {
      const clean = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, day] = clean.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(clean);
      }
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) {
      return typeof dateVal === 'string' ? dateVal : '';
    }
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return typeof dateVal === 'string' ? dateVal : '';
  }
};

/**
 * Clean target delivery date picker component with rental date sync and clear actions.
 */
export default function TargetDeliveryDatePicker({
  needByDate,
  setNeedByDate,
  hasRentalItems,
  rentalStartDate,
}) {
  const targetDateInputRef = React.useRef(null);

  const handleOpenDatePicker = () => {
    if (targetDateInputRef.current) {
      if (typeof targetDateInputRef.current.showPicker === 'function') {
        try {
          targetDateInputRef.current.showPicker();
          return;
        } catch {}
      }
      targetDateInputRef.current.focus();
    }
  };

  const formattedValue =
    typeof needByDate === 'string'
      ? needByDate.includes('T')
        ? needByDate.split('T')[0]
        : needByDate
      : '';

  return (
    <div className="py-4 sm:py-5 mb-2 border-b border-black/5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">calendar_clock</span>
          Target Delivery Date
          <span className="text-[9px] font-medium text-secondary/70 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full lowercase tracking-normal">
            optional
          </span>
        </label>
        {hasRentalItems && rentalStartDate && needByDate !== rentalStartDate && (
          <button
            type="button"
            onClick={() => setNeedByDate(rentalStartDate)}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">sync</span>
            Sync with Rental Date
          </button>
        )}
      </div>

      <div
        onClick={handleOpenDatePicker}
        className={`group relative flex items-center justify-between w-full h-11 sm:h-12 rounded-xl border px-3.5 shadow-2xs cursor-pointer transition-all ${
          needByDate
            ? 'border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20'
            : 'border-outline-variant/30 bg-surface-bright hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
            calendar_today
          </span>
          <span
            className={`min-w-0 truncate text-[13px] select-none ${
              needByDate
                ? 'text-neutral-900 dark:text-white font-semibold'
                : 'text-secondary/60 font-normal'
            }`}
          >
            {needByDate ? formatDisplayDate(needByDate) : 'Select preferred delivery date...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2 z-20">
          {needByDate && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNeedByDate('');
              }}
              className="p-1 rounded-full text-secondary/60 hover:text-on-surface hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              aria-label="Clear selected date"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="material-symbols-outlined text-[18px] text-secondary/40 group-hover:text-primary transition-colors pointer-events-none">
            edit_calendar
          </span>
        </div>

        <input
          ref={targetDateInputRef}
          type="date"
          min={new Date().toISOString().split('T')[0]}
          value={formattedValue}
          onChange={(e) => setNeedByDate(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            zIndex: 10,
            cursor: 'pointer',
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          aria-label="Target delivery date"
        />
      </div>
    </div>
  );
}
