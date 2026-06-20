import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import toast from 'react-hot-toast';

export function SettingsSection() {
  const { user, checkAuth } = useDashboard();

  const [prefsForm, setPrefsForm] = useState({
    email: true,
    marketing: true,
    theme: 'light',
    language: 'en',
  });
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPrefsForm({
        email: user.notificationPreferences?.email !== false,
        marketing: user.notificationPreferences?.marketing !== false,
        theme: user.accountPreferences?.theme || 'light',
        language: user.accountPreferences?.language || 'en',
      });
    }
  }, [user]);

  const handlePreferencesSave = async (e) => {
    e.preventDefault();
    setIsPreferencesSaving(true);
    try {
      const payload = {
        notificationPreferences: {
          email: prefsForm.email,
          marketing: prefsForm.marketing,
        },
        accountPreferences: {
          theme: prefsForm.theme,
          language: prefsForm.language,
        },
      };
      const res = await userService.updatePreferences(payload);
      if (res.success) {
        toast.success('Preferences saved successfully!');
        await checkAuth();
      }
    } catch (_err) {
      toast.error('Failed to save preference settings');
    } finally {
      setIsPreferencesSaving(false);
    }
  };

  return (
    <motion.div
      id="panel-preferences"
      role="tabpanel"
      key="tab-preferences"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-left"
    >
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-1 shadow-2xs">
        <h2 className="font-semibold text-sm text-on-surface tracking-wide">
          Preferences & Settings
        </h2>
        <span className="text-[10px] text-on-surface/60 font-light">
          Customize how you interact with Siri Arts & Crafts. All changes sync dynamically.
        </span>
      </div>

      <form onSubmit={handlePreferencesSave} className="space-y-5">
        <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-primary">
            Notification Subscriptions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3.5 p-4 bg-surface-bright border border-outline-variant/30 rounded-lg shadow-2xs hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  id="pref-email"
                  checked={prefsForm.email}
                  onChange={(e) => setPrefsForm({ ...prefsForm, email: e.target.checked })}
                  className="peer w-5 h-5 appearance-none rounded border-2 border-outline-variant checked:border-primary checked:bg-primary transition-colors cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 font-bold">
                  check
                </span>
              </div>
              <div>
                <span className="font-bold text-on-surface group-hover:text-primary transition-colors text-xs block mb-1">
                  Direct Order Invoicing & Transaction Updates
                </span>
                <span className="text-[10px] text-secondary font-light block leading-relaxed">
                  Receive real-time order logs, shipping statuses, verification keys, and tracking
                  parameters. (Highly Recommended)
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3.5 p-4 bg-surface-bright border border-outline-variant/30 rounded-lg shadow-2xs hover:border-primary/30 transition-all duration-300 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  id="pref-marketing"
                  checked={prefsForm.marketing}
                  onChange={(e) => setPrefsForm({ ...prefsForm, marketing: e.target.checked })}
                  className="peer w-5 h-5 appearance-none rounded border-2 border-outline-variant checked:border-primary checked:bg-primary transition-colors cursor-pointer"
                />
                <span className="material-symbols-outlined text-[16px] text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 font-bold">
                  check
                </span>
              </div>
              <div>
                <span className="font-bold text-on-surface group-hover:text-primary transition-colors text-xs block mb-1">
                  Exclusive Curations & Launch Alerts
                </span>
                <span className="text-[10px] text-secondary font-light block leading-relaxed">
                  Access premium limited-edition collections, holiday discount campaigns, and
                  early-bird event details.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPreferencesSaving}
            type="submit"
            className="btn-primary px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            {isPreferencesSaving ? (
              <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[13px]">tune</span>
                <span>Save Preferences</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
