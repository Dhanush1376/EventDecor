import React from 'react';

export function CustomOrderTypeSettings({ activeType, updateType }) {
  return (
    <div className="bg-black rounded-2xl p-5 shadow-xl text-white sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--color-gold)]">tune</span>
        <h3 className="font-bold text-[14px] uppercase tracking-wider">Type Settings</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
            Type ID (Read-only)
          </label>
          <input
            type="text"
            value={activeType.id}
            disabled
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-[12px] text-white/70"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={activeType.name}
            onChange={(e) => updateType(activeType.id, { name: e.target.value })}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--color-gold)] transition-colors text-white"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
            Description
          </label>
          <textarea
            value={activeType.description || ''}
            onChange={(e) => updateType(activeType.id, { description: e.target.value })}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--color-gold)] transition-colors text-white resize-none"
            rows={3}
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/10 bg-white/5 -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl">
        <div className="flex justify-between items-center py-2 border-b border-white/10 text-[12px]">
          <span className="text-white/70">Total Steps</span>
          <span className="font-bold">{activeType.steps?.length || 0}</span>
        </div>
        <div className="flex justify-between items-center py-2 text-[12px]">
          <span className="text-white/70">Total Fields</span>
          <span className="font-bold">
            {activeType.steps?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
