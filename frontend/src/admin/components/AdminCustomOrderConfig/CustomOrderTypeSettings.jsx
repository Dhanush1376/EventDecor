import React from 'react';

export function CustomOrderTypeSettings({ activeType, updateType }) {
  return (
    <div className="admin-card !rounded-[4px] p-5 space-y-4 sticky top-24 text-left">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--admin-border-subtle)]">
        <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
          tune
        </span>
        <h3 className="font-bold text-[13px] uppercase tracking-wider text-[var(--admin-text-primary)]">
          Type Settings
        </h3>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block mb-1">
            Type ID (System Key)
          </label>
          <input
            type="text"
            value={activeType.id}
            disabled
            className="w-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[4px] px-3 py-2 text-[12px] text-[var(--admin-text-secondary)] opacity-80 cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={activeType.name}
            onChange={(e) => updateType(activeType.id, { name: e.target.value })}
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block mb-1">
            Description
          </label>
          <textarea
            value={activeType.description || ''}
            onChange={(e) => updateType(activeType.id, { description: e.target.value })}
            className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] transition-colors resize-none"
            rows={3}
            placeholder="Describe what this order type handles..."
          />
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2">
        <div className="flex justify-between items-center py-1 text-[12px]">
          <span className="text-[var(--admin-text-secondary)]">Total Steps</span>
          <span className="font-bold text-[var(--admin-text-primary)]">
            {activeType.steps?.length || 0}
          </span>
        </div>
        <div className="flex justify-between items-center py-1 text-[12px]">
          <span className="text-[var(--admin-text-secondary)]">Total Fields</span>
          <span className="font-bold text-[var(--admin-accent)]">
            {activeType.steps?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
