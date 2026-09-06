export function MetadataStep({ formData, setFormData, isEdit }) {
  return (
    <div className="space-y-5">
      <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
        <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
          sell
        </span>
        1. Coupon Metadata
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="admin-label">Coupon Code *</label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., FESTIVE40"
            className="admin-input font-mono tracking-wider uppercase"
          />
        </div>
        <div className="space-y-1.5">
          <label className="admin-label">Discount Type</label>
          <select
            value={formData.discountType}
            onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
            className="admin-select"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Flat Amount (₹)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="admin-label">Discount Value *</label>
          <input
            type="number"
            required
            value={formData.discountValue}
            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
            placeholder="e.g. 15 for 15% or 500 for flat discount"
            className="admin-input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="admin-label">Minimum Purchase Amount (₹)</label>
          <input
            type="number"
            value={formData.minOrderAmount}
            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
            placeholder="e.g. 500"
            className="admin-input"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="admin-label">Maximum Discount Cap (₹)</label>
        <input
          type="number"
          value={formData.maxDiscount}
          disabled={formData.discountType === 'fixed'}
          onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
          placeholder={formData.discountType === 'fixed' ? 'N/A (Flat Discount)' : 'Unlimited'}
          className="admin-input disabled:opacity-40"
        />
      </div>
    </div>
  );
}
