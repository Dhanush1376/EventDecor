export function CouponPreview({ formData }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="bg-[var(--admin-bg-subtle)] px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-secondary)]">
            preview
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
            Live Preview
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-error" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
        </div>
      </div>

      <div className="p-8 bg-white flex flex-col items-center justify-center min-h-[400px] border-b border-[var(--admin-border-subtle)] relative">
        <div className="relative group cursor-pointer w-full max-w-sm">
          <div
            className={`rounded-xl transition-all duration-300 overflow-hidden relative shadow-[var(--admin-shadow-lg)] ${formData.isActive ? 'bg-white border-2 border-[var(--admin-accent)]' : 'bg-gray-50 border-2 border-dashed border-[var(--admin-text-placeholder)] grayscale opacity-70'}`}
          >
            <div className="bg-[var(--admin-accent)]/10 px-6 py-5 flex items-center justify-between relative overflow-hidden">
              <div
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-inner"
                style={{ borderRight: '1px solid var(--admin-border-subtle)' }}
              />
              <div
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-inner"
                style={{ borderLeft: '1px solid var(--admin-border-subtle)' }}
              />

              <div className="z-10 text-center w-full">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--admin-accent)] block mb-1">
                  {formData.isFeatured ? '⭐ Featured Offer' : 'Special Offer'}
                </span>
                <h3 className="text-3xl font-black text-[var(--admin-text-primary)] tracking-tight">
                  {formData.discountType === 'percentage'
                    ? `${formData.discountValue || '0'}% OFF`
                    : `₹${formData.discountValue || '0'} OFF`}
                </h3>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4 border-t border-dashed border-[var(--admin-border)]">
              <div className="text-center">
                <div className="inline-block border-2 border-dashed border-[var(--admin-text-tertiary)] rounded-lg px-4 py-2 bg-[var(--admin-surface-muted)]">
                  <span className="font-mono text-lg font-bold tracking-widest text-[var(--admin-text-primary)]">
                    {formData.code || 'CODE'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-center">
                {formData.minOrderAmount > 0 && (
                  <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                    On minimum purchase of ₹{formData.minOrderAmount}
                  </p>
                )}
                <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                  Valid till{' '}
                  {formData.expiryDate ? new Date(formData.expiryDate).toLocaleDateString() : 'TBD'}
                </p>
              </div>
            </div>

            <div className="bg-[var(--admin-surface-muted)] px-4 py-2 text-center border-t border-[var(--admin-border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                {formData.targetType === 'all'
                  ? 'Valid Storewide'
                  : formData.targetType === 'products'
                    ? `Valid on ${formData.targetProductIds.length} Products`
                    : formData.targetType === 'categories'
                      ? `Valid on ${formData.targetCategories.length} Categories`
                      : `For ${formData.targetUserTiers.length} VIP Tiers`}
              </span>
            </div>

            <div className="absolute top-3 right-3">
              {formData.isActive ? (
                <span className="bg-success/10 text-success text-[9px] font-bold px-2 py-0.5 rounded-full border border-success/20">
                  Active
                </span>
              ) : (
                <span className="bg-error/10 text-error text-[9px] font-bold px-2 py-0.5 rounded-full border border-error/20">
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[var(--admin-surface)] space-y-3">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[var(--admin-text-tertiary)] font-medium">
            Internal Setup Progress
          </span>
          <span className="text-[var(--admin-accent)] font-bold">
            {formData.code && formData.discountValue && formData.expiryDate
              ? 'Ready to Publish'
              : 'Drafting'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-[var(--admin-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--admin-accent)] rounded-full transition-all"
            style={{
              width:
                (formData.code ? 33 : 0) +
                (formData.discountValue ? 33 : 0) +
                (formData.expiryDate ? 34 : 0) +
                '%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
