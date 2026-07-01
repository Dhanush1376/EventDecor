import { AVAILABLE_TIERS } from '../constants';

export function TargetingStep({ formData, setFormData, products, availableCategories = [] }) {
  const toggleProductSelect = (productId) => {
    setFormData((prev) => {
      const current = [...prev.targetProductIds];
      const index = current.indexOf(productId);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(productId);
      }
      return { ...prev, targetProductIds: current };
    });
  };

  const toggleCategorySelect = (category) => {
    setFormData((prev) => {
      const current = [...prev.targetCategories];
      const index = current.indexOf(category);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(category);
      }
      return { ...prev, targetCategories: current };
    });
  };

  const toggleTierSelect = (tier) => {
    setFormData((prev) => {
      const current = [...prev.targetUserTiers];
      const index = current.indexOf(tier);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(tier);
      }
      return { ...prev, targetUserTiers: current };
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
        <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
          groups
        </span>
        2. Customer & Catalog Segment Targeting
      </h2>
      <div className="space-y-1.5">
        <label className="admin-label">Segmentation Rules Model</label>
        <select
          value={formData.targetType}
          onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
          className="admin-select"
        >
          <option value="all">Apply to All Products & All Customers</option>
          <option value="products">Apply ONLY to Selected Products</option>
          <option value="categories">Apply ONLY to Selected Categories</option>
          <option value="tiers">Apply ONLY to Specific Loyalty Tiers</option>
        </select>
      </div>

      {formData.targetType === 'products' && (
        <div className="admin-card-inset p-4 space-y-3">
          <label className="admin-label">
            Select Eligible Catalog Products ({formData.targetProductIds.length} Selected)
          </label>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {products.length === 0 ? (
              <p className="text-[12px] text-[var(--admin-text-tertiary)] italic">
                No products found in database
              </p>
            ) : (
              products.map((p) => {
                const isChecked = formData.targetProductIds.includes(p._id || p.id);
                return (
                  <label
                    key={p._id || p.id}
                    className="flex items-center gap-3 p-2.5 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[13px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleProductSelect(p._id || p.id)}
                      className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                    />
                    <div className="flex items-center gap-2">
                      <img
                        src={p.imageSrc}
                        alt={p.title}
                        className="w-8 h-8 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)]"
                      />
                      <div>
                        <span className="font-semibold text-[var(--admin-text-primary)]">
                          {p.title}
                        </span>
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] ml-2">
                          ₹{p.price}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {formData.targetType === 'categories' && (
        <div className="admin-card-inset p-4 space-y-3">
          <label className="admin-label">
            Select Eligible Storefront Categories ({formData.targetCategories.length} Selected)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableCategories.length === 0 ? (
              <span className="text-[13px] text-slate-500">Loading categories...</span>
            ) : (
              availableCategories.map((cat) => {
                const isChecked = formData.targetCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-3 p-2.5 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[13px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCategorySelect(cat)}
                      className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                    />
                    <span className="font-semibold text-[var(--admin-text-primary)]">{cat}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {formData.targetType === 'tiers' && (
        <div className="admin-card-inset p-4 space-y-3">
          <label className="admin-label">
            Select Eligible Loyalty Membership Tiers ({formData.targetUserTiers.length} Selected)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AVAILABLE_TIERS.map((tier) => {
              const isChecked = formData.targetUserTiers.includes(tier);
              return (
                <label
                  key={tier}
                  className="flex items-center gap-3 p-3 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[13px]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTierSelect(tier)}
                    className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                  />
                  <span className="font-semibold text-[var(--admin-text-primary)]">
                    {tier} Member
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
