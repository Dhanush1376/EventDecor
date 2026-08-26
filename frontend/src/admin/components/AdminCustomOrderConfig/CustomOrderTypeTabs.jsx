import React from 'react';

export function CustomOrderTypeTabs({ config, activeTypeTab, setActiveTypeTab }) {
  return (
    <div className="flex gap-1 sm:gap-2 bg-[#f2efe9] p-1 rounded-md sm:rounded-full w-full sm:w-max border border-black/5 shadow-inner overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {config.types?.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTypeTab(t.id)}
          className={`shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 rounded-sm sm:rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all ${
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
