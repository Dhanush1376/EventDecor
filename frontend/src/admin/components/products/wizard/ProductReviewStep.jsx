import React from 'react';
import { AdminToggle } from '../../AdminUIKit';

export function ProductReviewStep(props) {
  const {
    formData,
    setFormData,
    _isCompressing,
    _setIsCompressing,
    _compressionProgress,
    _setCompressionProgress,
    _compressionStats,
    _setCompressionStats,
    _categoriesList,
    _setCategoriesList,
    _isCustomCategory,
    _setIsCustomCategory,
    _focusedField,
    _handleAIFill,
    _isAIGenerating,
    _newVariant,
    _setNewVariant,
    _handleAddVariant,
    _handleRemoveVariant,
    _showRentalSettings,
    _setShowRentalSettings,
  } = props;

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

        {/* Non-Refundable Item Toggle */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between col-span-1 sm:col-span-2">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Non-Refundable Item
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Customers cannot request returns or refunds for this product after purchase.
            </p>
          </div>
          <AdminToggle
            checked={formData.isNonRefundable}
            onChange={() =>
              setFormData({ ...formData, isNonRefundable: !formData.isNonRefundable })
            }
          />
        </div>

        {/* Summary Data Review list */}
        <div className="col-span-1 sm:col-span-2 p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4 text-[12px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border)]/60 pb-1.5 mb-2">
            Curation Credentials Summary
          </p>
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
            <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Show in Gallery
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.showInGallery ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
