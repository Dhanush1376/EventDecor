import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import React from 'react';
import { AdminToggle } from '../../components/AdminUIKit';

export function ProductPricingStep({
  formData,
  setFormData,
  showRentalSettings,
  setShowRentalSettings,
}) {
  return (
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
            Stock is below threshold. A 'Low Stock' badge will trigger automatically in the catalog.
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
                    <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                        Availability Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { v: 'purchase_only', l: 'Purchase Only', i: 'shopping_bag' },
                          { v: 'rent_only', l: 'Rent Only', i: 'event_available' },
                          { v: 'both', l: 'Both', i: 'join' },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setFormData({ ...formData, availabilityMode: opt.v })}
                            className={`h-[38px] px-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                              formData.availabilityMode === opt.v
                                ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-sm'
                                : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/30 hover:text-[var(--admin-text-primary)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{opt.i}</span>
                            <span className="truncate">{opt.l}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ═══ RENTAL PRICING & INVENTORY ═══ */}
                    <div className="space-y-4">
                      {/* Row 1: Rental Price & Duration */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                            Rental Price (₹) <span className="text-error">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                              ₹
                            </span>
                            <input
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
                              placeholder="0"
                              className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                            Rental Duration (Up to Days) <span className="text-error">*</span>
                          </label>
                          <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[16px]">
                              schedule
                            </span>
                            <input
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
                              placeholder="1"
                              className="w-full bg-[var(--admin-surface)] rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
                            />
                          </div>
                          <span className="text-[10px] text-[var(--admin-text-secondary)]/70 mt-1 block">
                            Package price covers rental bookings up to this duration
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Security Deposit & Refundable Toggle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                            Security Deposit (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                              ₹
                            </span>
                            <input
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
                              className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex flex-col justify-between">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                            Deposit Refundable
                          </label>
                          <div className="flex items-center justify-between h-[38px] px-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl">
                            <span className="text-[12.5px] font-medium text-[var(--admin-text-primary)]">
                              {formData.isDepositRefundable ? 'Refundable' : 'Non-Refundable'}
                            </span>
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

                      {/* Row 3: Stock & Booking Limits */}
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
                              value={formData.rentalStock ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  rentalStock: e.target.value,
                                })
                              }
                              placeholder="0"
                              className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
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
                            value={formData.rentalMinDays ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                rentalMinDays: e.target.value,
                              })
                            }
                            placeholder="1"
                            className="w-full bg-[var(--admin-surface)] rounded-xl px-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
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
                            value={formData.rentalMaxDays ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                rentalMaxDays: e.target.value,
                              })
                            }
                            placeholder="365"
                            className="w-full bg-[var(--admin-surface)] rounded-xl px-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
