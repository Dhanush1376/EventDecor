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
          className={`w-full bg-[var(--admin-surface)] rounded-[4px] p-3 text-[12.5px] outline-none transition-all resize-none ${
            focusedField === 'description'
              ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30'
              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
          }`}
        />
      </div>
    </div>
  );
}
