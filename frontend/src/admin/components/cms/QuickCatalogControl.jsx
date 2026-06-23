import React from 'react';
import { SectionHeader } from '../AdminUIKit';
import { useAdmin } from '../../context/AdminContext';

export function QuickCatalogControl() {
  const { products, toggleProductFeatured } = useAdmin();
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="inventory_2"
        title="Featured Shelf Flags"
        description="Fast adjustment controls to tag items displaying inside our recommended catalog lists"
      />
      <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1 scrollbar-none">
        {products?.slice(0, 8).map((prd) => (
          <div
            key={prd.id}
            className="p-3 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex items-center justify-between gap-3 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <img
                src={prd.image}
                alt={prd.name}
                className="w-10 h-10 object-cover rounded-xl border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] shrink-0"
              />
              <div>
                <span className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1 leading-tight">
                  {prd.name}
                </span>
                <span className="text-[11px] text-[var(--admin-accent)] font-semibold uppercase tracking-widest mt-1 block">
                  {prd.category}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleProductFeatured(prd.id)}
              className={`p-2.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-[var(--admin-shadow-xs)] active:scale-95 ${
                prd.featured
                  ? 'bg-[var(--admin-accent)]/15 border-[var(--admin-accent)]/40 text-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                  : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] block font-bold">star</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
