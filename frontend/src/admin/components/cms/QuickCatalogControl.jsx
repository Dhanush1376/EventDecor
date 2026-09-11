import React from 'react';
import { useAdmin } from '../../context/AdminContext';

export function QuickCatalogControl() {
  const { products, toggleProductFeatured } = useAdmin();
  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">inventory_2</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Recommended Shelf Curation
          </span>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {products?.slice(0, 12).map((prd) => (
              <div
                key={prd.id}
                className="p-3.5 bg-[var(--admin-surface-muted)]/70 hover:bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] flex items-center justify-between gap-3 shadow-2xs hover:border-[var(--admin-border)] transition-all duration-300"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={prd.image}
                    alt={prd.name}
                    className="w-11 h-11 object-cover rounded-md border border-[var(--admin-border-subtle)] shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block line-clamp-1 leading-tight">
                      {prd.name}
                    </span>
                    <span className="text-[11px] text-[var(--admin-accent)] font-semibold uppercase tracking-wider mt-1 block">
                      {prd.category}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleProductFeatured(prd.id)}
                  className={`h-9 px-3 rounded-[4px] border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 text-[12px] font-semibold shrink-0 ${
                    prd.featured
                      ? 'bg-[var(--admin-accent)]/15 border-[var(--admin-accent)]/40 text-[var(--admin-accent)] shadow-2xs'
                      : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {prd.featured ? 'star' : 'star_outline'}
                  </span>
                  <span>{prd.featured ? 'Featured' : 'Feature'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
