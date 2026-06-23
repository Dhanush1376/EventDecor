import React from 'react';

export function AestheticsStep({ formData, setFormData, focusedField }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
          Commercials & Aesthetics
        </h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Define rental rates, colors, setup time, and prop lists.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Rental Price (₹) <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
              ₹
            </span>
            <input
              type="number"
              required
              min="1"
              inputMode="decimal"
              value={formData.rentalPrice}
              onChange={(e) => setFormData({ ...formData, rentalPrice: Number(e.target.value) })}
              className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2.5 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
            />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Estimated Setup (Hours)
          </label>
          <input
            type="number"
            value={formData.setupTimeHours}
            onChange={(e) => setFormData({ ...formData, setupTimeHours: Number(e.target.value) })}
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
              focusedField === 'setupTimeHours'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Color Palette (comma-separated)
          </label>
          <input
            type="text"
            value={formData.colorPalette}
            onChange={(e) => setFormData({ ...formData, colorPalette: e.target.value })}
            placeholder="#8B0000, #FFD700"
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] font-mono outline-none transition-all ${
              focusedField === 'colorPalette'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Inclusions (comma-separated)
          </label>
          <textarea
            rows={3}
            value={formData.inclusionsText}
            onChange={(e) => setFormData({ ...formData, inclusionsText: e.target.value })}
            placeholder="Lotus brass urli, Jasmine rope runners..."
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
              focusedField === 'inclusionsText'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Suggested Add-on Props
          </label>
          <textarea
            rows={3}
            value={formData.suggestedProps}
            onChange={(e) => setFormData({ ...formData, suggestedProps: e.target.value })}
            placeholder="Beaded shagun boxes, Mogra garland drops..."
            className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
              focusedField === 'suggestedProps'
                ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
