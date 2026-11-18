import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductReviewStep({ formData, setFormData }) {
  const primaryImage = formData.images?.[0] || formData.imageSrc;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-[13px] font-bold text-[var(--admin-text-primary)]">Review & Publish</h2>
        <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
          Everything looks good! Take a quick look before saving to your store.
        </p>
      </div>

      {/* Top Quick Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Visibility Status */}
        <div className="p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Product Status
            </p>
            <p className="text-[10.5px] text-[var(--admin-text-secondary)]">
              {formData.isActive ? 'Live and visible in store' : 'Saved as private draft'}
            </p>
          </div>
          <select
            value={formData.isActive ? 'active' : 'draft'}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 h-8 text-[11.5px] font-bold text-[var(--admin-text-primary)] cursor-pointer outline-none shadow-xs"
          >
            <option value="active">Live (Visible)</option>
            <option value="draft">Draft (Hidden)</option>
          </select>
        </div>

        {/* Show on Home Screen */}
        <div className="p-3.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
              Show on Home Screen
            </p>
            <p className="text-[10.5px] text-[var(--admin-text-secondary)]">
              Feature this item on the homepage
            </p>
          </div>
          <AdminToggle
            checked={formData.featured}
            onChange={() => setFormData({ ...formData, featured: !formData.featured })}
          />
        </div>
      </div>

      {/* Clean Product Summary Card */}
      <div className="p-4 sm:p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
          <p className="text-[12px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
              inventory_2
            </span>
            Product Summary
          </p>
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-[3px] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)]">
            {formData.isActive ? 'Active' : 'Draft'}
          </span>
        </div>

        {/* Visual Hero: Image + Title + Price */}
        <div className="flex items-center gap-3.5 sm:gap-4 pb-4 border-b border-[var(--admin-border)]">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[4px] overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-surface)] shrink-0 shadow-xs">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={formData.title || 'Product'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--admin-text-tertiary)]">
                <span className="material-symbols-outlined text-[22px]">image_not_supported</span>
                <span className="text-[8px] font-bold mt-1 uppercase">No Photo</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-[15px] sm:text-[17px] font-bold text-[var(--admin-text-primary)] truncate">
              {formData.title || 'Untitled Product'}
            </h3>
            {formData.teluguTitle && (
              <p className="text-[12.5px] text-[var(--admin-text-secondary)] font-medium truncate">
                {formData.teluguTitle}
              </p>
            )}
            <div className="pt-0.5">
              <span className="text-[17px] sm:text-[19px] font-extrabold text-[var(--admin-accent)]">
                ₹{Number(formData.price || 0).toLocaleString()}
              </span>
              {formData.oldPrice && Number(formData.oldPrice) > Number(formData.price) && (
                <span className="text-[11.5px] text-[var(--admin-text-tertiary)] line-through ml-2">
                  ₹{Number(formData.oldPrice).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Attributes (Clear & Simple) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12px]">
          <div className="p-2.5 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-between">
            <span className="text-[var(--admin-text-secondary)] font-medium">Category</span>
            <span className="font-bold text-[var(--admin-text-primary)] truncate max-w-[180px]">
              {formData.primaryCategory || formData.category || 'Unassigned'}
            </span>
          </div>

          <div className="p-2.5 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-between">
            <span className="text-[var(--admin-text-secondary)] font-medium">Fulfillment</span>
            <span className="font-bold text-[var(--admin-accent)]">
              {formData.inventoryMode === 'made_to_order'
                ? 'Always Available'
                : `${formData.stock || 0} Units in Stock`}
            </span>
          </div>

          <div className="p-2.5 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-between">
            <span className="text-[var(--admin-text-secondary)] font-medium">Home Screen</span>
            <span
              className={`font-bold ${formData.featured ? 'text-emerald-600' : 'text-[var(--admin-text-secondary)]'}`}
            >
              {formData.featured ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Customization Details (Only shown if enabled) */}
        {formData.customizationConfig?.enabled && (
          <div className="p-2.5 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 text-[11.5px] flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>
              Personalization is allowed ({formData.customizationConfig.label || 'Customization'})
            </span>
          </div>
        )}

        {/* Customer Care Note (Only shown if provided) */}
        {formData.customerNote && (
          <div className="p-3 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[12px] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block">
              Customer Note
            </span>
            <p className="text-[var(--admin-text-primary)] whitespace-pre-line leading-relaxed text-[11.5px]">
              {formData.customerNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
