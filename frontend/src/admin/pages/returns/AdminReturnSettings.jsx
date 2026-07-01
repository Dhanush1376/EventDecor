import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import { PageHeader, EmptyState, SkeletonForm, fadeUp, stagger } from '../../components/AdminUIKit';

const AdminReturnSettings = () => {
  const {
    returnSettings: settings,
    fetchReturnSettings: fetchSettings,
    saveReturnSettings: updateSettings,
    loading,
    error,
  } = useReturnManagement();

  const [localSettings, setLocalSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (error && !localSettings) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load settings"
        description={error}
        action={
          <button className="admin-btn admin-btn-primary" onClick={fetchSettings}>
            Try Again
          </button>
        }
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 max-w-4xl">
      <PageHeader
        title="Return & Exchange Settings"
        subtitle="Configure return windows, auto-approvals, and fraud thresholds"
        icon="settings"
        iconColor="primary"
        headerAction={
          <button
            className="admin-btn admin-btn-primary min-h-[36px]"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="w-16 h-16 border-[1px] border-white/30 border-t-white rounded-full animate-spin duration-1000 ease-linear"></span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">save</span>
            )}
            Save Changes
          </button>
        }
      />

      <div className="space-y-6">
        {loading && !localSettings ? (
          <>
            <SkeletonForm fields={4} />
            <SkeletonForm fields={3} />
          </>
        ) : !localSettings ? null : (
          <>
            <motion.div variants={fadeUp} className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">General Policies</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-bold text-[var(--admin-text-primary)] mb-2">
                      Default Return Window (Days)
                    </label>
                    <input
                      type="number"
                      className="admin-input w-full"
                      value={localSettings.defaultReturnWindow || 7}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          defaultReturnWindow: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1.5">
                      Standard timeframe allowed for most products.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[var(--admin-text-primary)] mb-2">
                      Quality Check Required
                    </label>
                    <select
                      className="admin-input w-full"
                      value={
                        localSettings.inspectionRules?.inspectionRequiredByDefault
                          ? 'true'
                          : 'false'
                      }
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          inspectionRules: {
                            ...localSettings.inspectionRules,
                            inspectionRequiredByDefault: e.target.value === 'true',
                          },
                        })
                      }
                    >
                      <option value="true">Yes, inspect all returns</option>
                      <option value="false">No, process upon receipt</option>
                    </select>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1.5">
                      Mandate warehouse inspection before refund.
                    </p>
                  </div>
                </div>

                <hr className="border-[var(--admin-border-subtle)]" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                      Auto-Approve Low Value Returns
                    </div>
                    <div className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                      Automatically approve return requests under a specific amount.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={(localSettings.inspectionRules?.autoApproveBelowAmount || 0) > 0}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          inspectionRules: {
                            ...localSettings.inspectionRules,
                            autoApproveBelowAmount: e.target.checked ? 1000 : 0,
                          },
                        })
                      }
                    />
                    <div className="w-9 h-5 bg-[var(--admin-surface-muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--admin-border)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--admin-accent)] border border-[var(--admin-border-subtle)]"></div>
                  </label>
                </div>

                {(localSettings.inspectionRules?.autoApproveBelowAmount || 0) > 0 && (
                  <div className="bg-[var(--admin-surface-hover)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
                    <label className="block text-[13px] font-bold text-[var(--admin-text-primary)] mb-2">
                      Max Auto-Approve Value (₹)
                    </label>
                    <input
                      type="number"
                      className="admin-input w-full md:w-1/2"
                      value={localSettings.inspectionRules?.autoApproveBelowAmount || 0}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          inspectionRules: {
                            ...localSettings.inspectionRules,
                            autoApproveBelowAmount: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Fraud & Risk Thresholds</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-bold text-[var(--admin-text-primary)] mb-2">
                      High Risk Score Threshold
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        className="w-full h-2 bg-[var(--admin-surface-muted)] rounded-lg appearance-none cursor-pointer"
                        min="0"
                        max="100"
                        value={localSettings.fraudThresholds?.highRiskScore || 80}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            fraudThresholds: {
                              ...localSettings.fraudThresholds,
                              highRiskScore: parseInt(e.target.value),
                            },
                          })
                        }
                      />
                      <span className="text-[14px] font-bold text-[var(--admin-domain-danger)] w-8 text-right">
                        {localSettings.fraudThresholds?.highRiskScore || 80}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1.5">
                      Scores above this flag users as High Risk.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[var(--admin-text-primary)] mb-2">
                      Max Returns Before Flag
                    </label>
                    <input
                      type="number"
                      className="admin-input w-full"
                      value={localSettings.fraudThresholds?.maxReturnsPerMonth || 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          fraudThresholds: {
                            ...localSettings.fraudThresholds,
                            maxReturnsPerMonth: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1.5">
                      Maximum returns allowed per month before triggering manual review.
                    </p>
                  </div>
                </div>

                <hr className="border-[var(--admin-border-subtle)]" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[var(--admin-text-primary)] text-[var(--admin-domain-danger)]">
                      Block Serial Returners
                    </div>
                    <div className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                      Automatically block users who exceed the high risk threshold multiple times.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={localSettings.fraudThresholds?.autoBlockHighRisk || false}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          fraudThresholds: {
                            ...localSettings.fraudThresholds,
                            autoBlockHighRisk: e.target.checked,
                          },
                        })
                      }
                    />
                    <div className="w-9 h-5 bg-[var(--admin-surface-muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--admin-border)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--admin-domain-danger)] border border-[var(--admin-border-subtle)]"></div>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Tiered Approval Workflow (Req #20) */}
            <motion.div variants={fadeUp} className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Tiered Approval Workflows</h2>
              </div>
              <div className="p-6">
                <p className="text-[12px] text-[var(--admin-text-secondary)] mb-6">
                  Configure which administrative roles are required to approve returns based on
                  their value.
                </p>

                <div className="space-y-4">
                  {(localSettings.approvalThresholds || []).map((tier, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row gap-4 items-center bg-[var(--admin-surface-hover)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]"
                    >
                      <div className="flex-1 w-full">
                        <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1">
                          Threshold Value (₹)
                        </label>
                        <input
                          type="number"
                          className="admin-input w-full bg-[var(--admin-surface)]"
                          value={tier.threshold}
                          onChange={(e) => {
                            const newTiers = [...localSettings.approvalThresholds];
                            newTiers[index].threshold = parseInt(e.target.value);
                            setLocalSettings({ ...localSettings, approvalThresholds: newTiers });
                          }}
                        />
                      </div>
                      <div className="flex-1 w-full">
                        <label className="block text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1">
                          Requires Role
                        </label>
                        <select
                          className="admin-input w-full bg-[var(--admin-surface)]"
                          value={tier.level}
                          onChange={(e) => {
                            const newTiers = [...localSettings.approvalThresholds];
                            newTiers[index].level = e.target.value;
                            setLocalSettings({ ...localSettings, approvalThresholds: newTiers });
                          }}
                        >
                          <option value="auto">Auto Approve</option>
                          <option value="manager">Store Manager</option>
                          <option value="senior_admin">Senior Admin</option>
                        </select>
                      </div>
                      <button
                        className="admin-btn admin-btn-danger mt-4 sm:mt-0"
                        onClick={() => {
                          const newTiers = [...localSettings.approvalThresholds];
                          newTiers.splice(index, 1);
                          setLocalSettings({ ...localSettings, approvalThresholds: newTiers });
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                  <button
                    className="admin-btn admin-btn-secondary w-full"
                    onClick={() => {
                      const newTiers = [...(localSettings.approvalThresholds || [])];
                      newTiers.push({ threshold: 5000, level: 'manager' });
                      setLocalSettings({ ...localSettings, approvalThresholds: newTiers });
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Approval Tier
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AdminReturnSettings;
