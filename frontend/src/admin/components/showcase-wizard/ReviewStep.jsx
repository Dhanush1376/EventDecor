import React from 'react';

export function ReviewStep({ formData, setFormData, colors }) {
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

        {/* Summary Data Review list */}
        <div className="col-span-1 sm:col-span-2 p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4 text-[12px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border)]/60 pb-1.5 mb-2">
            Curation Credentials Summary
          </p>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Showcase Title
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.title || 'Unassigned'}
              </span>
            </div>
            {formData.subtitle && (
              <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                  Subtitle
                </span>
                <span className="font-semibold text-[var(--admin-text-primary)] sm:text-right">
                  {formData.subtitle}
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
                Rental Price
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                ₹{Number(formData.rentalPrice || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Colors
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {colors.length} mapped
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-1">
              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                Setup Time
              </span>
              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                {formData.setupTimeHours} Hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
