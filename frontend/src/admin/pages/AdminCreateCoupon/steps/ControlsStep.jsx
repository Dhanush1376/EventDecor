export function ControlsStep({ formData, setFormData }) {
  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
            rule
          </span>
          3. Exclusions & Coupon Rules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="admin-label">Validity Start Date *</label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="admin-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="admin-label">Coupon Expiry Date *</label>
            <input
              type="date"
              required
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="admin-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1 space-y-1.5">
            <label className="admin-label">Global Limit</label>
            <input
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              placeholder="Unlimited"
              className="admin-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="admin-label">Stacking Rules</label>
            <select
              value={formData.stackingRule}
              onChange={(e) => setFormData({ ...formData, stackingRule: e.target.value })}
              className="admin-select"
            >
              <option value="exclusive">Standalone Exclusive (Cannot Stack)</option>
              <option value="stackable">Stackable (Can Combine Offers)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="admin-label">Coupon Priority Level</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              placeholder="e.g. 1"
              className="admin-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
