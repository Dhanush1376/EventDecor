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
      <div className="py-5">
        <div className="pb-5 mb-5 border-b border-outline-variant/20">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">tune</span>
            Preferences & Settings
          </h2>
        </div>

        <form onSubmit={handlePreferencesSave} className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-5">
              <span className="material-symbols-outlined text-[12px]">notifications</span>
              Notification Subscriptions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3.5 py-4 border-b md:border-b-0 md:border-r border-outline-variant/20 last:border-0 cursor-pointer group pr-4">
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

              <label className="flex items-start gap-3.5 py-4 cursor-pointer group pl-0 md:pl-4">
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

          <div className="flex justify-end pt-4">
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
      </div>
    </motion.div>
  );
}
