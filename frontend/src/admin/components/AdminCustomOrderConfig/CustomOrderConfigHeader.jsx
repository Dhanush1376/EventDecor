import React from 'react';

export function CustomOrderConfigHeader({
  config,
  savingDraft,
  publishing,
  handleSaveDraft,
  handlePublish,
  setShowPreviewModal,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[var(--admin-surface)] p-4 sm:p-5 rounded-2xl border border-[var(--admin-border)] shadow-sm gap-4 sm:gap-0">
      <div className="w-full sm:w-auto">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-[var(--admin-text-primary)]">
            Enterprise Custom Orders Engine
          </h2>
          {config.status === 'draft' ? (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase rounded border border-yellow-200 whitespace-nowrap">
              Unpublished Draft
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold uppercase rounded border border-green-200 whitespace-nowrap">
              Live (v{config.version})
            </span>
          )}
        </div>
        <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1">
          Build multi-step wizards, manage fields via drag-and-drop, and define custom workflows.
        </p>
      </div>
      <div className="flex flex-row sm:flex-row flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          onClick={() => setShowPreviewModal(true)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] border border-black/10 shadow-sm hover:bg-black/5 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          Preview
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="flex-1 sm:flex-none flex items-center justify-center bg-[var(--admin-bg-subtle)] text-black px-4 sm:px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] border border-[var(--admin-border)] shadow-sm hover:bg-white transition-all disabled:opacity-50"
        >
          {savingDraft ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 sm:flex-none flex items-center justify-center bg-[var(--admin-accent)] text-white px-4 sm:px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-[var(--admin-accent-hover)] transition-all disabled:opacity-50 min-w-max"
        >
          {publishing ? 'Publishing...' : 'Publish Live'}
        </button>
      </div>
    </div>
  );
}
