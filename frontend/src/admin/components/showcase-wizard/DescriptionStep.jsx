import React from 'react';

export function DescriptionStep({ formData, setFormData, focusedField }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
          Atmospheric Narrative
        </h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Provide clients with rich heritage descriptions, aesthetics, and setup context.
        </p>
      </div>

      <div className="col-span-2">
        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
          Arrangement Description <span className="text-error">*</span>
        </label>
        <textarea
          rows={6}
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the aesthetics, craftsmanship, and occasion contexts..."
          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
            focusedField === 'description'
              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
          }`}
        />
      </div>
    </div>
  );
}
