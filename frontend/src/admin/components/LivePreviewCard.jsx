import React, { useMemo } from 'react';
import { ProductCard } from '../../components/shared/ProductCard';

export function LivePreviewCard({ formData, mobileTab, categoriesList = [] }) {
  const resolvedCategory = useMemo(() => {
    const cat = formData.primaryCategory || formData.category;
    if (typeof cat === 'object' && cat !== null) {
      return cat.name || 'General Decor';
    }
    if (typeof cat === 'string' && cat.trim()) {
      if (/^[a-fA-F0-9]{24}$/.test(cat)) {
        const found = categoriesList.find((c) => (typeof c === 'object' ? c._id === cat : false));
        if (found) return found.name || found.title || 'General Decor';
      }
      if (cat.toLowerCase() !== 'category') {
        return cat;
      }
    }
    return 'General Decor';
  }, [formData.primaryCategory, formData.category, categoriesList]);

  return (
    <>
      {/* Live Catalog Preview Card */}
      <div
        className={`lg:sticky lg:top-24 space-y-4 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)]">
              visibility
            </span>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
              Storefront Preview
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* Exact Storefront Product Card without outer card background */}
        <div className="w-full max-w-[300px] sm:max-w-[320px] mx-auto">
          <ProductCard
            title={formData.title || 'Product Title'}
            teluguTitle={formData.teluguTitle}
            price={Number(formData.price || 0)}
            oldPrice={formData.oldPrice ? Number(formData.oldPrice) : null}
            imageSrc={formData.imageSrc}
            category={resolvedCategory}
            primaryCategory={resolvedCategory}
            badges={
              formData.badges
                ? formData.badges
                    .split(',')
                    .map((b) => b.trim())
                    .filter(Boolean)
                : []
            }
            stock={formData.stock !== '' ? Number(formData.stock) : 10}
            rentalEnabled={formData.rentalEnabled}
            availabilityMode={formData.availabilityMode}
            rentalPricing={formData.rentalPricing}
            isNonRefundable={formData.isNonRefundable}
            rating={0}
            onQuickView={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </>
  );
}
