import { DISPLAY_LOCATIONS } from '../constants';

export function ControlsStep({ formData, setFormData }) {
  const toggleDisplayLocation = (location) => {
    setFormData((prev) => {
      const current = [...prev.displayLocations];
      const index = current.indexOf(location);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(location);
      }
      return { ...prev, displayLocations: current };
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
            visibility
          </span>
          3. Storefront Visibility & Auto-Apply Settings
        </h2>
        <div className="admin-card-inset p-4 space-y-4">
          <label className="admin-label">Where should this coupon be displayed?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DISPLAY_LOCATIONS.map((loc) => {
              const isChecked = formData.displayLocations.includes(loc.value);
              return (
                <label
                  key={loc.value}
                  className="flex items-center gap-3 p-2.5 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[12px]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDisplayLocation(loc.value)}
                    className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                  />
                  <span className="text-[var(--admin-text-primary)] font-semibold">
                    {loc.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-4 p-4 admin-card-inset rounded-[var(--admin-radius-lg)] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="w-4 h-4 rounded accent-[var(--admin-accent)]"
            />
            <div>
              <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
                Mark as Featured Offer
              </p>
              <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                Highlighted on promotion banners
              </p>
            </div>
          </label>
          <label className="flex items-center gap-4 p-4 admin-card-inset rounded-[var(--admin-radius-lg)] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAutoApply}
              onChange={(e) => setFormData({ ...formData, isAutoApply: e.target.checked })}
              className="w-4 h-4 rounded accent-[var(--admin-accent)]"
            />
            <div>
              <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
                Auto-Apply at Checkout
              </p>
              <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                Applies automatically if conditions match
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-5 pt-5 border-t border-[var(--admin-border-subtle)]">
        <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
            payments
          </span>
          4. Loyalty Wallet Cashback Perks
        </h2>
        <p className="text-[11px] text-[var(--admin-text-tertiary)]">
          Give customers promotional Siri Cash directly in their store wallets upon placing their
          orders. Admins can configure percentages, fixed credits, or hybrid reward perks!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="admin-label">Cashback Rate (%)</label>
            <input
              type="number"
              value={formData.cashbackPercentage}
              onChange={(e) => setFormData({ ...formData, cashbackPercentage: e.target.value })}
              placeholder="e.g. 5 for 5% cashback"
              className="admin-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="admin-label">Flat Wallet Cashback Credits (₹)</label>
            <input
              type="number"
              value={formData.cashbackFixed}
              onChange={(e) => setFormData({ ...formData, cashbackFixed: e.target.value })}
              placeholder="e.g. ₹100 flat cashback"
              className="admin-input"
            />
          </div>
        </div>
      </div>

      <div className="space-y-5 pt-5 border-t border-[var(--admin-border-subtle)]">
        <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
            rule
          </span>
          5. Exclusions & Campaign Rules
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
            <label className="admin-label">Campaign Expiry Date *</label>
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
            <label className="admin-label">Campaign Priority Level</label>
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
