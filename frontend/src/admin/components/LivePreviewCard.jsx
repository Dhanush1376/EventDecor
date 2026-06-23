import React from 'react';
import { ProductCard } from '../../components/shared/ProductCard';

export function LivePreviewCard({ formData, mobileTab }) {
  return (
    <>
      {/* Live Catalog Preview Card */}
      <div
        className={`lg:sticky lg:top-24 space-y-6 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
      >
        <div className="text-center lg:text-left">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--admin-text-secondary)]">
            Storefront Preview
          </span>
          <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/75 mt-0.5">
            Real-time catalog rendition of your craft product
          </p>
        </div>

        {/* Luxury Card Rendering using real ProductCard */}
        <div className="w-full max-w-[340px] mx-auto bg-white rounded-2xl shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border)]/60 p-2">
          <ProductCard
            title={formData.title || 'Traditional Sanskriti Masterpiece'}
            teluguTitle={formData.teluguTitle}
            price={Number(formData.price || 0)}
            oldPrice={formData.oldPrice ? Number(formData.oldPrice) : null}
            imageSrc={formData.imageSrc}
            category={formData.category || 'Category Unassigned'}
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
            rating={4.9}
            onQuickView={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </>
  );
}
