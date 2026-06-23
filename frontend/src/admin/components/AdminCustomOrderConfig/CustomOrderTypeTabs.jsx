import React from 'react';

export function CustomOrderTypeTabs({ config, activeTypeTab, setActiveTypeTab }) {
  return (
    <div className="flex gap-2 bg-[#f2efe9] p-1 rounded-full w-max border border-black/5 shadow-inner">
      {config.types?.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTypeTab(t.id)}
          className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
            activeTypeTab === t.id
              ? 'bg-[var(--admin-text-primary)] text-white shadow-md'
              : 'text-[#685C57] hover:text-black'
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}
