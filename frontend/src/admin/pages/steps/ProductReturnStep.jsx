import React from 'react';
import { motion } from 'framer-motion';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export const ProductReturnStep = ({ formData, setFormData }) => {
  const { returnSettings = {} } = formData;

  const handleReturnSettingChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      returnSettings: {
        ...prev.returnSettings,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div variants={fadeUp} className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title flex items-center gap-2">
            <span className="material-icons-outlined text-[var(--admin-primary)]">
              assignment_return
            </span>
            Return Policy (Req #7)
          </h2>
        </div>
        <div className="admin-card-body space-y-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={returnSettings.isReturnable}
              onChange={(e) => handleReturnSettingChange('isReturnable', e.target.checked)}
            />
            <div>
              <div className="font-medium text-[var(--admin-text-primary)]">Accept Returns</div>
              <div className="text-sm text-[var(--admin-text-secondary)]">
                Allow customers to return this product for a refund.
              </div>
            </div>
          </label>

          {returnSettings.isReturnable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pl-8 border-l-2 border-[var(--admin-border)] space-y-4 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Return Window (Days)</label>
                  <div className="admin-input-group">
                    <input
                      type="number"
                      className="admin-input"
                      min="1"
                      value={returnSettings.returnWindowDays}
                      onChange={(e) =>
                        handleReturnSettingChange('returnWindowDays', parseInt(e.target.value) || 0)
                      }
                    />
                    <span className="admin-input-suffix">Days</span>
                  </div>
                </div>
                <div>
                  <label className="admin-label">Restocking Fee (%)</label>
                  <div className="admin-input-group">
                    <input
                      type="number"
                      className="admin-input"
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
                    <span className="admin-input-suffix">%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title flex items-center gap-2">
            <span className="material-icons-outlined text-[var(--admin-info)]">swap_horiz</span>
            Exchange Policy
          </h2>
        </div>
        <div className="admin-card-body space-y-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={returnSettings.isExchangeable}
              onChange={(e) => handleReturnSettingChange('isExchangeable', e.target.checked)}
            />
            <div>
              <div className="font-medium text-[var(--admin-text-primary)]">Accept Exchanges</div>
              <div className="text-sm text-[var(--admin-text-secondary)]">
                Allow customers to exchange this product (e.g. for a different size/color).
              </div>
            </div>
          </label>

          {returnSettings.isExchangeable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pl-8 border-l-2 border-[var(--admin-border)] space-y-4 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Exchange Window (Days)</label>
                  <div className="admin-input-group">
                    <input
                      type="number"
                      className="admin-input"
                      min="1"
                      value={returnSettings.exchangeWindowDays}
                      onChange={(e) =>
                        handleReturnSettingChange(
                          'exchangeWindowDays',
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                    <span className="admin-input-suffix">Days</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title flex items-center gap-2">
            <span className="material-icons-outlined text-[var(--admin-warning)]">fact_check</span>
            Warehouse Inspection
          </h2>
        </div>
        <div className="admin-card-body">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={returnSettings.requiresInspection}
              onChange={(e) => handleReturnSettingChange('requiresInspection', e.target.checked)}
            />
            <div>
              <div className="font-medium text-[var(--admin-text-primary)]">
                Mandatory Physical Inspection
              </div>
              <div className="text-sm text-[var(--admin-text-secondary)]">
                If checked, refunds will ONLY be processed after warehouse staff physically inspects
                and approves the returned item.
              </div>
            </div>
          </label>
        </div>
      </motion.div>
    </div>
  );
};
