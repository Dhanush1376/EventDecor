import React from 'react';

export function AestheticsStep({
  formData,
  setFormData,
  focusedField,
  newInclusion = { name: '', defaultQty: 1, condition: 'excellent' },
  setNewInclusion = () => {},
  handleAddInclusion = () => {},
  handleRemoveInclusion = () => {},
}) {
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
              className={`w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-9 text-[12.5px] outline-none transition-all ${
                focusedField === 'rentalPrice'
                  ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30'
                  : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
              }`}
            />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Striking Price / MRP (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
              ₹
            </span>
            <input
              type="number"
              min="1"
              inputMode="decimal"
              value={formData.strikingPrice || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  strikingPrice: e.target.value ? Number(e.target.value) : '',
                })
              }
              placeholder="e.g. 20000 (Optional)"
              className={`w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-9 text-[12.5px] outline-none transition-all ${
                focusedField === 'strikingPrice'
                  ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30'
                  : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
              }`}
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
            className={`w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none transition-all ${
              focusedField === 'setupTimeHours'
                ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
            }`}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Color Palette (comma-separated)
          </label>
          <input
            type="text"
            value={formData.colorPalette}
            onChange={(e) => setFormData({ ...formData, colorPalette: e.target.value })}
            placeholder="#8B0000, #FFD700"
            className={`w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12.5px] font-mono outline-none transition-all ${
              focusedField === 'colorPalette'
                ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
            }`}
          />
        </div>

        {/* Dynamic Inclusions Constructor */}
        <div className="col-span-2 p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
            Included Items & Props
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              placeholder="Item Name (e.g. Lotus brass urli)"
              value={newInclusion.name}
              onChange={(e) => setNewInclusion({ ...newInclusion, name: e.target.value })}
              className="bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12px] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] outline-none w-full col-span-1 sm:col-span-2 transition-all"
            />
            <input
              type="number"
              placeholder="Qty (e.g. 1)"
              value={newInclusion.defaultQty}
              onChange={(e) =>
                setNewInclusion({ ...newInclusion, defaultQty: Number(e.target.value) })
              }
              className="bg-[var(--admin-surface)] rounded-[4px] px-3 h-9 text-[12px] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] outline-none w-full transition-all"
            />
            <button
              type="button"
              onClick={handleAddInclusion}
              className="bg-[var(--admin-accent)] text-white text-[11px] font-bold uppercase h-9 rounded-[4px] hover:opacity-95 cursor-pointer w-full transition-all active:scale-95 shadow-xs flex items-center justify-center gap-1"
            >
              Add Item
            </button>
          </div>

          {/* Rendered inclusions list */}
          {(formData.inclusions || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.inclusions.map((i) => (
                <span
                  key={i.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[11px] rounded-[4px] text-[var(--admin-text-primary)] font-medium"
                >
                  <span className="text-[var(--admin-text-secondary)]">{i.name}</span>
                  <span className="text-[var(--admin-accent)] font-bold">(x{i.defaultQty})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInclusion(i.id)}
                    className="text-[var(--admin-text-tertiary)] hover:text-red-500 ml-1 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
            Suggested Add-on Props
          </label>
          <textarea
            rows={3}
            value={formData.suggestedProps}
            onChange={(e) => setFormData({ ...formData, suggestedProps: e.target.value })}
            placeholder="Beaded shagun boxes, Mogra garland drops..."
            className={`w-full bg-[var(--admin-surface)] rounded-[4px] p-3 text-[12.5px] outline-none transition-all resize-none ${
              focusedField === 'suggestedProps'
                ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30'
                : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
