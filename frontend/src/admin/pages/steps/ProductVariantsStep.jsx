import React from 'react';

export function ProductVariantsStep({
  formData,
  setFormData,
  isAIGenerating,
  handleAIFill,
  focusedField,
  newVariant,
  setNewVariant,
  handleAddVariant,
  handleRemoveVariant,
}) {
  return (
    <div className="space-y-5">
      <div className="mb-4">
        <div>
          <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
            Variants & Tags
          </h2>
          <p className="text-[11px] text-[var(--admin-text-secondary)]">
            Define attributes, variations, and storefront badges.
          </p>
        </div>
      </div>

      {/* Badge Pill Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Storefront Badges (comma-separated)
          </label>
          <input
            type="text"
            value={formData.badges}
            onChange={(e) => setFormData({ ...formData, badges: e.target.value })}
            placeholder="Best Seller, Heritage Craft"
            className="w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Tags / Collections
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g. brass, puja, diwali"
            className={`w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all ${
              focusedField === 'tags'
                ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
            }`}
          />
        </div>
      </div>

      {/* Dynamic Variant Constructor */}
      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
          Add Variation Parameter
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            type="text"
            placeholder="Attribute (e.g. Wood)"
            value={newVariant.name}
            onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
            className="bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)] w-full"
          />
          <input
            type="text"
            placeholder="Value (e.g. Rosewood)"
            value={newVariant.value}
            onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
            className="bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)] w-full"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="+/- Price (₹)"
            value={newVariant.price}
            onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
            className="bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)] w-full"
          />
          <button
            type="button"
            onClick={handleAddVariant}
            className="bg-[var(--admin-accent)] text-white text-[11px] font-bold uppercase h-9 rounded-[4px] hover:brightness-110 cursor-pointer w-full transition-transform active:scale-95 shadow-xs"
          >
            Add Option
          </button>
        </div>

        {/* Rendered variants list */}
        {formData.variants.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.variants.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11px] rounded-[4px] text-[var(--admin-text-primary)] font-medium shadow-2xs"
              >
                <span className="text-[var(--admin-text-secondary)]">{v.name}:</span> {v.value}
                {v.price && (
                  <span className="text-[var(--admin-accent)] font-bold">
                    ({Number(v.price) >= 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(v.id)}
                  className="text-[var(--admin-error)] hover:opacity-80 ml-1 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
