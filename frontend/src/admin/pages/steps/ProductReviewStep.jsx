import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductReviewStep({ formData, setFormData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
          Validation & Curation
        </h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Review details and set visibility preferences before publishing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Visibility Status Toggle */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Visibility Status
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Controls visible storefront availability
            </p>
          </div>
          <select
            value={formData.isActive ? 'active' : 'draft'}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-3 py-1.5 text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] cursor-pointer outline-none"
          >
            <option value="active">Active (Visible)</option>
            <option value="draft">Draft (Private)</option>
          </select>
        </div>

        {/* Curation Highlight Toggle */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Featured Collection
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Pin to Homepage Hero Carousel
            </p>
          </div>
          <AdminToggle
            checked={formData.featured}
            onChange={() => setFormData({ ...formData, featured: !formData.featured })}
          />
        </div>

        {/* Show in Gallery Toggle */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between col-span-1 sm:col-span-2">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Show in Gallery Also
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Automatically sync and display this product in the Inspiration Gallery
            </p>
          </div>
          <AdminToggle
            checked={formData.showInGallery}
            onChange={() => setFormData({ ...formData, showInGallery: !formData.showInGallery })}
          />
        </div>

        {/* Summary Data Review list */}
        <div className="col-span-1 sm:col-span-2 p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4 text-[12px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border)]/60 pb-1.5 mb-4">
            Curation Credentials Summary
          </p>

          <div className="flex items-start gap-4 mb-4 pb-4 border-b border-[var(--admin-border)]/40">
            {formData.images && formData.images.length > 0 ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[var(--admin-accent)]/20 shadow-sm shrink-0">
                <img
                  src={formData.images[0]}
                  className="w-full h-full object-cover"
                  alt="Primary Cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--admin-accent)]/90 backdrop-blur-sm text-white text-[8px] font-extrabold tracking-widest text-center py-0.5 uppercase">
                  Primary
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-[var(--admin-surface)] border border-dashed border-[var(--admin-border)] flex flex-col items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[var(--admin-text-tertiary)] text-[20px]">
                  image_not_supported
                </span>
                <span className="text-[8px] font-bold text-[var(--admin-text-tertiary)] mt-1 uppercase">
                  No Image
                </span>
              </div>
            )}

            <div className="flex-1 flex flex-col justify-center space-y-1 pt-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[10px]">
                Product Overview
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                {formData.title || 'Untitled Product'}
              </span>
              <span className="font-bold text-[var(--admin-accent)] text-[13px]">
                ₹{Number(formData.price || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                English Title
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.title}
              </span>
            </div>
            {formData.teluguTitle && (
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                  Telugu Title
                </span>
                <span className="font-semibold text-[var(--admin-text-primary)] sm:text-right">
                  {formData.teluguTitle}
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Category
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.category || 'Unassigned'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Retail Price
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                ₹{Number(formData.price || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Stock Quantity
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.stock || 0} Units
              </span>
            </div>
            {formData.material && (
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                  Core Material
                </span>
                <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                  {formData.material}
                </span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Featured
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.featured ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Show in Gallery
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.showInGallery ? 'Yes' : 'No'}
              </span>
            </div>

            {/* New Added Fields */}
            {formData.customerNote && (
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                  Customer Note
                </span>
                <span className="font-bold text-[var(--admin-text-primary)] sm:text-right max-w-[200px] truncate">
                  {formData.customerNote}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Personalization
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.customizationConfig?.enabled
                  ? `Yes (${formData.customizationConfig.label || 'Default Label'})`
                  : 'No'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Complimentary Gift
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.complimentaryGift?.hasComplimentaryGift
                  ? `Yes (${formData.complimentaryGift.giftQuantity || 1}x ${formData.complimentaryGift.giftName || 'Gift'})`
                  : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
