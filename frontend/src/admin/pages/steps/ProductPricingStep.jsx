import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useId } from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductPricingStep({
  formData,
  setFormData,
  showRentalSettings,
  setShowRentalSettings,
}) {
  const sellingPriceId = useId();
  const mrpPriceId = useId();
  const stockQtyId = useId();
  const rentalPriceId = useId();
  const rentalDurationId = useId();
  const securityDepositId = useId();
  const returnWindowId = useId();

  // If rental is enabled and availability was purchase_only, default to 'both'
  useEffect(() => {
    if (formData.rentalEnabled && formData.availabilityMode === 'purchase_only') {
      setFormData((prev) => ({ ...prev, availabilityMode: 'both' }));
    }
  }, [formData.rentalEnabled, formData.availabilityMode, setFormData]);

  const handleReturnSettingChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      returnSettings: { ...prev.returnSettings, [field]: value },
    }));
  };

  const sellingPriceNum = Number(formData.price) || 0;
  const mrpNum = Number(formData.oldPrice) || 0;
  const hasDiscount = mrpNum > sellingPriceNum && sellingPriceNum > 0;
  const discountSavings = mrpNum - sellingPriceNum;
  const discountPercent = mrpNum > 0 ? Math.round((discountSavings / mrpNum) * 100) : 0;
  const mrpLowerThanSelling = mrpNum > 0 && sellingPriceNum > 0 && mrpNum <= sellingPriceNum;

  return (
    <div className="space-y-5">
      {/* ═══ STEP HEADER ═══ */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border)]">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--admin-text-primary)]">Pricing</h2>
          <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
            Set price and optional settings.
          </p>
        </div>
      </div>

      {/* ═══ 1. PRICE CARD ═══ */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[8px] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">payments</span>
            </div>
            <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)]">Price</h3>
          </div>

          {/* Compact Live Discount Pill */}
          {hasDiscount && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 rounded-full text-[11px] font-bold">
              <span className="material-symbols-outlined text-[13px]">local_offer</span>₹
              {discountSavings.toLocaleString()} off ({discountPercent}%)
            </span>
          )}

          {mrpLowerThanSelling && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 rounded-full text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[13px]">warning</span>
              MRP should be higher than price
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Selling Price */}
          <div className="space-y-1">
            <label
              htmlFor={sellingPriceId}
              className="text-[11.5px] font-bold text-[var(--admin-text-primary)] block"
            >
              Selling Price (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[var(--admin-accent)]">
                ₹
              </span>
              <input
                id={sellingPriceId}
                type="number"
                required
                min="1"
                inputMode="decimal"
                placeholder="e.g. 1999"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-[var(--admin-bg-subtle)]/50 rounded-[6px] pl-8 pr-3 h-9 text-[13.5px] font-bold text-[var(--admin-text-primary)] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] transition-all shadow-xs"
              />
            </div>
          </div>

          {/* MRP */}
          <div className="space-y-1">
            <label
              htmlFor={mrpPriceId}
              className="text-[11.5px] font-bold text-[var(--admin-text-primary)] block"
            >
              MRP (₹){' '}
              <span className="text-[10px] font-normal text-[var(--admin-text-secondary)]">
                (Optional)
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[var(--admin-text-tertiary)]">
                ₹
              </span>
              <input
                id={mrpPriceId}
                type="number"
                inputMode="decimal"
                value={formData.oldPrice}
                onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                placeholder="e.g. 2499"
                className="w-full bg-[var(--admin-bg-subtle)]/50 rounded-[6px] pl-8 pr-3 h-9 text-[13.5px] font-medium text-[var(--admin-text-primary)] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] transition-all shadow-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 2. OPTIONS (Stock, Returns, Exchanges) ═══ */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[8px] shadow-xs overflow-hidden divide-y divide-[var(--admin-border)]">
        {/* ── STOCK ── */}
        <div className="p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[17px]">inventory_2</span>
              </div>
              <div>
                <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">Stock</p>
                <p className="text-[11px] text-[var(--admin-text-secondary)]">
                  {formData.inventoryMode === 'tracked' ? 'In stock' : 'Made to order'}
                </p>
              </div>
            </div>
            <AdminToggle
              checked={formData.inventoryMode === 'tracked'}
              onChange={() =>
                setFormData((prev) => ({
                  ...prev,
                  inventoryMode: prev.inventoryMode === 'tracked' ? 'made_to_order' : 'tracked',
                }))
              }
            />
          </div>

          <AnimatePresence>
            {formData.inventoryMode === 'tracked' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between gap-3 bg-[var(--admin-bg-subtle)]/40 p-2.5 rounded-[6px]">
                  <label
                    htmlFor={stockQtyId}
                    className="text-[11.5px] font-bold text-[var(--admin-text-primary)] block"
                  >
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-36 shrink-0">
                    <input
                      id={stockQtyId}
                      type="number"
                      required
                      min="0"
                      inputMode="numeric"
                      placeholder="e.g. 10"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full bg-[var(--admin-surface)] rounded-[5px] pl-2.5 pr-12 h-8.5 text-[12.5px] font-bold text-[var(--admin-text-primary)] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all shadow-xs"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-[var(--admin-text-secondary)]">
                      units
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RETURN & EXCHANGE (requested on WhatsApp, handled manually) ── */}
        <div className="p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[17px]">assignment_return</span>
              </div>
              <div>
                <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                  Return & Exchange
                </p>
                <p className="text-[11px] text-[var(--admin-text-secondary)]">
                  {formData.returnSettings?.isReturnable
                    ? 'Customers can request on WhatsApp'
                    : 'Not returnable or exchangeable'}
                </p>
              </div>
            </div>
            <AdminToggle
              checked={Boolean(formData.returnSettings?.isReturnable)}
              onChange={() =>
                handleReturnSettingChange('isReturnable', !formData.returnSettings?.isReturnable)
              }
            />
          </div>

          <AnimatePresence>
            {formData.returnSettings?.isReturnable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/40 p-2.5 rounded-[6px]">
                  <div>
                    <label
                      htmlFor={returnWindowId}
                      className="text-[10.5px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1 block"
                    >
                      Window (Days After Delivery) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={returnWindowId}
                      type="number"
                      min="1"
                      placeholder="e.g. 7"
                      value={formData.returnSettings?.returnWindowDays ?? ''}
                      onChange={(e) =>
                        handleReturnSettingChange('returnWindowDays', parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-[var(--admin-surface)] rounded-[5px] px-2.5 h-8.5 text-[12px] font-bold border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)] transition-all shadow-xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ 3. RENTAL (AT BOTTOM OF THE PAGE) ═══ */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[8px] p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[17px]">event_available</span>
            </div>
            <div>
              <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">Rental</p>
              <p className="text-[11px] text-[var(--admin-text-secondary)]">
                {formData.rentalEnabled ? 'Available for rent' : 'Purchase only'}
              </p>
            </div>
          </div>
          <AdminToggle
            checked={Boolean(formData.rentalEnabled)}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                rentalEnabled: !prev.rentalEnabled,
                availabilityMode: !prev.rentalEnabled ? 'both' : 'purchase_only',
              }))
            }
          />
        </div>

        <AnimatePresence>
          {formData.rentalEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-[var(--admin-border)] space-y-3 bg-[var(--admin-bg-subtle)]/40 p-3 rounded-[6px]">
                {/* Offering Mode: Both vs Rent Only */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-primary)] mb-1.5 block">
                    Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, availabilityMode: 'both' })}
                      className={`h-8.5 px-3 rounded-[5px] text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        formData.availabilityMode === 'both' ||
                        formData.availabilityMode === 'purchase_only'
                          ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-xs'
                          : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">join</span>
                      <span>Sell & Rent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, availabilityMode: 'rent_only' })}
                      className={`h-8.5 px-3 rounded-[5px] text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        formData.availabilityMode === 'rent_only'
                          ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-xs'
                          : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">event_busy</span>
                      <span>Rent Only</span>
                    </button>
                  </div>
                </div>

                {/* Pricing, Duration, Deposit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label
                      htmlFor={rentalPriceId}
                      className="text-[10.5px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block"
                    >
                      Rental Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[var(--admin-text-secondary)]">
                        ₹
                      </span>
                      <input
                        id={rentalPriceId}
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={formData.rentalPricing?.rentalPrice ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            rentalPricing: {
                              ...prev.rentalPricing,
                              rentalPrice: e.target.value,
                            },
                          }))
                        }
                        placeholder="e.g. 500"
                        className="w-full bg-[var(--admin-surface)] rounded-[5px] pl-6 pr-2.5 h-8.5 text-[12px] font-semibold outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={rentalDurationId}
                      className="text-[10.5px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block"
                    >
                      Duration (Days) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-[var(--admin-text-secondary)]">
                        schedule
                      </span>
                      <input
                        id={rentalDurationId}
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={formData.rentalPricing?.rentalDurationDays ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            rentalPricing: {
                              ...prev.rentalPricing,
                              rentalDurationDays: e.target.value,
                            },
                          }))
                        }
                        placeholder="3"
                        className="w-full bg-[var(--admin-surface)] rounded-[5px] pl-7 pr-2.5 h-8.5 text-[12px] font-semibold outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={securityDepositId}
                      className="text-[10.5px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block"
                    >
                      Deposit (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[var(--admin-text-secondary)]">
                        ₹
                      </span>
                      <input
                        id={securityDepositId}
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={formData.securityDeposit ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            securityDeposit: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="w-full bg-[var(--admin-surface)] rounded-[5px] pl-6 pr-2.5 h-8.5 text-[12px] font-semibold outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
