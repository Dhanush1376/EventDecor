export function HomeSectionState({
  title = 'Content unavailable',
  message = 'This homepage section is waiting for published content.',
  icon = 'inventory_2',
  actionLabel,
  onRetry,
}) {
  return (
    <div className="h1-container py-12">
      <div className="min-h-[220px] rounded-2xl border border-outline-variant/30 bg-surface/80 flex flex-col items-center justify-center text-center px-6">
        <span className="material-symbols-outlined text-[36px] text-on-surface-variant/50 mb-4">
          {icon}
        </span>
        <h3 className="font-display text-xl text-on-surface mb-2">{title}</h3>
        <p className="text-sm text-on-surface-variant max-w-md leading-6">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-on-surface text-surface px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em]"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            {actionLabel || 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
