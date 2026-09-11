import React from 'react';

export function CustomOrderConfigHeader({
  config,
  savingDraft,
  publishing,
  handleSaveDraft,
  handlePublish,
}) {
  return (
    <div className="bg-[var(--admin-surface)] p-3.5 sm:p-4 rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      {/* Title, Badge & Guidance */}
      <div className="w-full sm:w-auto">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <h2 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)]">
            Custom Order Form
          </h2>
          {config?.status === 'draft' ? (
            <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9.5px] font-bold uppercase rounded-[4px] border border-amber-200 dark:border-amber-800 shrink-0">
              Draft
            </span>
          ) : (
            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9.5px] font-bold uppercase rounded-[4px] border border-emerald-200 dark:border-emerald-800 shrink-0">
              Live (v{config?.version || 1})
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1 hidden sm:block">
          Edit the steps and questions customers fill out on the website.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="h-8.5 sm:h-8 px-3.5 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-bg-subtle)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] text-[11px] sm:text-[10.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
        >
          {savingDraft ? (
            <span className="w-3.5 h-3.5 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[15px]">save</span>
          )}
          <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="h-8.5 sm:h-8 px-3.5 rounded-[4px] bg-[var(--admin-accent)] hover:brightness-110 active:scale-[0.98] text-white border border-[var(--admin-accent)] text-[11px] sm:text-[10.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
        >
          {publishing ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[15px]">publish</span>
          )}
          <span>{publishing ? 'Publishing...' : 'Publish Live'}</span>
        </button>
      </div>
    </div>
  );
}
