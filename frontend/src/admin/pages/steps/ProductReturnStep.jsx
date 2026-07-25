import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminToggle } from '../../components/AdminUIKit';

export const ProductReturnStep = ({ formData, setFormData }) => {
  const { returnSettings = {} } = formData;

  const handleReturnSettingChange = (field, value) => {
    setFormData((prev) => {
      const newSettings = {
        ...prev.returnSettings,
        [field]: value,
      };

      // Automatically turn ON inspection if returns or exchanges are being enabled
      if ((field === 'isReturnable' || field === 'isExchangeable') && value === true) {
        newSettings.requiresInspection = true;
      }

      // Automatically turn OFF inspection if BOTH are being disabled
      if ((field === 'isReturnable' || field === 'isExchangeable') && value === false) {
        const otherField = field === 'isReturnable' ? 'isExchangeable' : 'isReturnable';
        if (!newSettings[otherField]) {
          newSettings.requiresInspection = false;
        }
      }

      return {
        ...prev,
        returnSettings: newSettings,
      };
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── RETURN POLICY ── */}
      <div className="p-4 sm:p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
              Return Policy
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
              Allow customers to request returns or refunds for this product after purchase.
            </p>
          </div>
          <AdminToggle
            checked={returnSettings.isReturnable}
            onChange={() => handleReturnSettingChange('isReturnable', !returnSettings.isReturnable)}
          />
        </div>

        <AnimatePresence>
          {returnSettings.isReturnable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4 border-t border-[var(--admin-border)]/50 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                      Return Window (Days)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                      min="1"
                      value={returnSettings.returnWindowDays}
                      onChange={(e) =>
                        handleReturnSettingChange('returnWindowDays', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                      Restocking Fee (%)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                      min="0"
                      max="100"
                      value={returnSettings.restockingFeePercentage}
                      onChange={(e) =>
                        handleReturnSettingChange(
                          'restockingFeePercentage',
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── EXCHANGE POLICY ── */}
      <div className="p-4 sm:p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
              Exchange Policy
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
              Allow customers to request exchanges for this product (e.g., for a different
              size/color).
            </p>
          </div>
          <AdminToggle
            checked={returnSettings.isExchangeable}
            onChange={() =>
              handleReturnSettingChange('isExchangeable', !returnSettings.isExchangeable)
            }
          />
        </div>

        <AnimatePresence>
          {returnSettings.isExchangeable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4 border-t border-[var(--admin-border)]/50 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                      Exchange Window (Days)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                      min="1"
                      value={returnSettings.exchangeWindowDays}
                      onChange={(e) =>
                        handleReturnSettingChange(
                          'exchangeWindowDays',
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── WAREHOUSE INSPECTION ── */}
      <div
        className={`p-4 sm:p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4 transition-opacity duration-300 ${!returnSettings.isReturnable && !returnSettings.isExchangeable ? 'opacity-50 grayscale-[50%]' : ''}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
              Mandatory Warehouse Inspection
            </p>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
              If checked, refunds/exchanges will ONLY be processed after warehouse staff physically
              inspects and approves the returned item.
            </p>
          </div>
          <AdminToggle
            checked={returnSettings.requiresInspection}
            disabled={!returnSettings.isReturnable && !returnSettings.isExchangeable}
            onChange={() =>
              handleReturnSettingChange('requiresInspection', !returnSettings.requiresInspection)
            }
          />
        </div>
      </div>
    </div>
  );
};
