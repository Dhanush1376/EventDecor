import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductPricingStep({
  formData,
  setFormData,
  showRentalSettings,
  setShowRentalSettings,
}) {
  return (
    <>
      {/* STEP 5: PRICING & STOCK */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
              Pricing & Inventory
            </h2>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Define stock and list prices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                Curation Price (₹) <span className="text-error">*</span>
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
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40 "
                />
              </div>
            </div>

            <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                Old Striking Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]/50 text-[13px] font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={formData.oldPrice}
                  onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                  placeholder="Optional list price"
                  className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40 "
                />
              </div>
            </div>

            <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                Available Stock <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                  #
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  inputMode="decimal"
                  placeholder="Units"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40 "
                />
              </div>
            </div>
          </div>

          {formData.stock !== '' && Number(formData.stock) <= 5 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-[11px] sm:text-[11px] text-amber-700 font-semibold">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>
                Stock is below threshold. A 'Low Stock' badge will trigger automatically in the
                catalog.
              </span>
            </div>
          )}

          {/* ═══ RENTAL SETTINGS SECTION ═══ */}
          <div className="border-t border-[var(--admin-border)]/60 pt-5 mt-2">
            <button
              type="button"
              onClick={() => {
                setShowRentalSettings(!showRentalSettings);
                if (!showRentalSettings && !formData.rentalEnabled)
                  setFormData((prev) => ({ ...prev, rentalEnabled: true }));
              }}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-indigo-600">
                    event_available
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                    Rental Settings
                  </p>
                  <p className="text-[11px] text-[var(--admin-text-secondary)]">
                    {formData.rentalEnabled
                      ? 'Rental is enabled — click to configure'
                      : 'Enable rental for this product'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {formData.rentalEnabled && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Active
                  </span>
                )}
                <span
                  className={`material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)] transition-transform ${showRentalSettings ? 'rotate-180' : ''}`}
                >
                  expand_more
                </span>
              </div>
            </button>

            <AnimatePresence>
              {showRentalSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4">
                    {/* Enable Rental Toggle */}
                    <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                          Enable Rental
                        </p>
                        <p className="text-[11px] text-[var(--admin-text-secondary)]">
                          Allow customers to rent this product
                        </p>
                      </div>
                      <AdminToggle
                        checked={formData.rentalEnabled}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            rentalEnabled: !formData.rentalEnabled,
                            availabilityMode: !formData.rentalEnabled ? 'both' : 'purchase_only',
                          })
                        }
                      />
                    </div>

                    {formData.rentalEnabled && (
                      <>
                        {/* Availability Mode */}
                        <div className="p-5 bg-white/50 backdrop-blur-sm border border-[var(--admin-border)] rounded-2xl shadow-sm">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">category</span>
                            Availability Mode
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              {
                                v: 'purchase_only',
                                l: 'Purchase Only',
                                i: 'shopping_bag',
                              },
                              { v: 'rent_only', l: 'Rent Only', i: 'event_available' },
                              { v: 'both', l: 'Both', i: 'join' },
                            ].map((opt) => (
                              <button
                                key={opt.v}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, availabilityMode: opt.v })
                                }
                                className={`p-4 rounded-xl border-2 text-center transition-all duration-300 cursor-pointer group ${
                                  formData.availabilityMode === opt.v
                                    ? 'border-transparent bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-200/50 scale-[1.02]'
                                    : 'border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
                                }`}
                              >
                                <span
                                  className={`material-symbols-outlined text-[24px] block mb-1 transition-transform duration-300 group-hover:scale-110 ${formData.availabilityMode === opt.v ? 'text-white' : ''}`}
                                >
                                  {opt.i}
                                </span>
                                <span
                                  className={`text-[10.5px] font-extrabold uppercase tracking-widest ${formData.availabilityMode === opt.v ? 'text-indigo-50' : ''}`}
                                >
                                  {opt.l}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Enable Smart Pricing Toggle */}
                        <div
                          className={`p-5 rounded-2xl flex items-center justify-between transition-all duration-500 border ${!formData.isManualRentalPricing ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-200 shadow-inner' : 'bg-white border-[var(--admin-border)]'}`}
                        >
                          <div>
                            <p
                              className={`text-[13px] font-extrabold flex items-center gap-1.5 ${!formData.isManualRentalPricing ? 'text-indigo-700' : 'text-[var(--admin-text-primary)]'}`}
                            >
                              <span
                                className={`material-symbols-outlined text-[18px] ${!formData.isManualRentalPricing ? 'text-indigo-600 animate-pulse' : ''}`}
                              >
                                auto_awesome
                              </span>{' '}
                              Smart Rental Pricing
                            </p>
                            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                              Auto-calculate prices & deposits from product selling price
                            </p>
                            {formData.isManualRentalPricing && (
                              <div className="mt-3 flex items-center gap-3">
                                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 shadow-sm flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">
                                    warning
                                  </span>{' '}
                                  Manual Override Enabled
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      isManualRentalPricing: false,
                                    }));
                                    toast.success(
                                      'Smart Pricing re-enabled. Values will auto-calculate based on price.',
                                    );
                                  }}
                                  className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors hover:underline"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    restart_alt
                                  </span>{' '}
                                  Reset to Smart Pricing
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="scale-110">
                            <AdminToggle
                              checked={!formData.isManualRentalPricing}
                              onChange={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  isManualRentalPricing: !prev.isManualRentalPricing,
                                }))
                              }
                            />
                          </div>
                        </div>

                        {/* Rental Pricing */}
                        <div className="p-5 bg-white border border-[var(--admin-border)] rounded-2xl space-y-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">
                                payments
                              </span>
                              Rental Pricing
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.price)
                                  return toast.error('Please enter Product Selling Price first');
                                const calculated = calculateRentalPricing(
                                  formData.price,
                                  formData.category,
                                );
                                if (calculated) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    rentalPricing: {
                                      ...prev.rentalPricing,
                                      daily: calculated.daily,
                                      weekly: calculated.weekly,
                                      monthly: calculated.monthly,
                                    },
                                  }));
                                  toast.success('Rental prices auto-calculated');
                                }
                              }}
                              className="text-[10.5px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg shadow-indigo-200/50 px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5 active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[14px]">bolt</span>{' '}
                              Auto Calculate
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { k: 'daily', l: 'Daily Rate (₹/day)' },
                              { k: 'weekly', l: 'Weekly Rate (₹/week)' },
                              { k: 'monthly', l: 'Monthly Rate (₹/month)' },
                            ].map((field) => (
                              <div key={field.k} className="group">
                                <label className="text-[10.5px] font-extrabold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                                  {field.l}
                                </label>
                                <div className="relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-50 border-r border-[var(--admin-border)] rounded-l-xl">
                                    <span className="text-[var(--admin-text-secondary)] text-[14px] font-bold">
                                      ₹
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    inputMode="decimal"
                                    value={formData.rentalPricing?.[field.k] || ''}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        isManualRentalPricing: true,
                                        rentalPricing: {
                                          ...prev.rentalPricing,
                                          [field.k]: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="0"
                                    className="w-full bg-white rounded-xl pl-12 pr-4 py-2.5 text-[14px] font-semibold text-[var(--admin-text-primary)] outline-none border-2 border-[var(--admin-border)] focus:border-indigo-500 transition-colors group-hover:border-indigo-300"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Security Deposit + Refundable */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-5 bg-white border border-[var(--admin-border)] rounded-2xl relative shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                                Security Deposit (₹)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!formData.price)
                                    return toast.error('Please enter Product Selling Price first');
                                  const calculated = calculateRentalPricing(
                                    formData.price,
                                    formData.category,
                                  );
                                  if (calculated) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      securityDeposit: calculated.securityDeposit,
                                    }));
                                    toast.success('Security deposit auto-calculated');
                                  }
                                }}
                                className="text-[10.5px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg shadow-amber-200/50 px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  lock_reset
                                </span>{' '}
                                Auto Calculate
                              </button>
                            </div>
                            <div className="relative">
                              <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-50 border-r border-[var(--admin-border)] rounded-l-xl">
                                <span className="text-[var(--admin-text-secondary)] text-[14px] font-bold">
                                  ₹
                                </span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={formData.securityDeposit}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    isManualRentalPricing: true,
                                    securityDeposit: e.target.value,
                                  }))
                                }
                                placeholder="e.g. 500"
                                className="w-full bg-white rounded-xl pl-12 pr-4 py-2.5 text-[14px] font-semibold text-[var(--admin-text-primary)] outline-none border-2 border-[var(--admin-border)] focus:border-amber-500 transition-colors group-hover:border-amber-300"
                              />
                            </div>
                          </div>
                          <div className="p-5 bg-white border border-[var(--admin-border)] rounded-2xl flex items-center justify-between shadow-sm">
                            <div>
                              <p className="text-[13px] font-extrabold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px] text-emerald-600">
                                  currency_exchange
                                </span>{' '}
                                Refundable Deposit
                              </p>
                              <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                                Refund deposit back to customer after successful return
                              </p>
                            </div>
                            <div className="scale-110">
                              <AdminToggle
                                checked={formData.isDepositRefundable}
                                onChange={() =>
                                  setFormData({
                                    ...formData,
                                    isDepositRefundable: !formData.isDepositRefundable,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rental Inventory + Duration Limits */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                              Rental Stock
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                                #
                              </span>
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={formData.rentalStock}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    rentalStock: e.target.value,
                                  })
                                }
                                placeholder="Units for rent"
                                className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-indigo-400"
                              />
                            </div>
                          </div>
                          <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                              Min Rental Days
                            </label>
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={formData.rentalMinDays}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  rentalMinDays: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--admin-surface)] rounded-xl px-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-indigo-400"
                            />
                          </div>
                          <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                              Max Rental Days
                            </label>
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={formData.rentalMaxDays}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  rentalMaxDays: e.target.value,
                                })
                              }
                              className="w-full bg-[var(--admin-surface)] rounded-xl px-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-indigo-400"
                            />
                          </div>
                        </div>

                        {/* Smart Recommendation Panel */}
                        {formData.price && (
                          <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-100 rounded-2xl mt-6 shadow-sm overflow-hidden relative">
                            {/* Decorative blur elements */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-200/40 rounded-full blur-3xl"></div>

                            <div className="relative z-10">
                              <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                                    workspace_premium
                                  </span>
                                </div>
                                <h4 className="text-[14px] font-extrabold text-emerald-900 tracking-wide">
                                  Smart Rental Recommendations
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {(() => {
                                  const rec = calculateRentalPricing(
                                    formData.price,
                                    formData.category,
                                  );
                                  if (!rec) return null;
                                  const roi = ((rec.monthly * 12) / Number(formData.price)) * 100;
                                  let profitCategory = 'Fair';
                                  if (roi >= 200) profitCategory = 'Excellent';
                                  else if (roi >= 100) profitCategory = 'Good';
                                  return (
                                    <>
                                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                          Daily
                                        </p>
                                        <p className="text-[15px] font-black text-emerald-950">
                                          ₹{rec.daily.toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                          Weekly
                                        </p>
                                        <p className="text-[15px] font-black text-emerald-950">
                                          ₹{rec.weekly.toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                          Monthly
                                        </p>
                                        <p className="text-[15px] font-black text-emerald-950">
                                          ₹{rec.monthly.toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                          Deposit
                                        </p>
                                        <p className="text-[15px] font-black text-emerald-950">
                                          ₹{rec.securityDeposit.toLocaleString()}
                                        </p>
                                      </div>
                                      <div className="col-span-2 sm:col-span-4 bg-white/90 p-3 rounded-xl text-center mt-2 flex justify-center items-center gap-3 border border-white shadow-sm">
                                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-widest">
                                          Estimated Profitability:
                                        </span>
                                        <span
                                          className={`text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest shadow-sm border ${profitCategory === 'Excellent' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white border-emerald-500' : profitCategory === 'Good' ? 'bg-gradient-to-r from-teal-400 to-teal-500 text-white border-teal-500' : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 border-gray-300'}`}
                                        >
                                          {profitCategory}
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
}
