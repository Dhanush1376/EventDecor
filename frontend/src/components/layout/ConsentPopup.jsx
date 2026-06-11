import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../../services/domainServices';
import toast from 'react-hot-toast';

import { safeLocalStorage } from '../../utils/storage';

import logger from '../../utils/logger';

export function ConsentPopup() {
  const [step, setStep] = useState('idle'); // 'idle' | 'cookie' | 'notification' | 'done'
  const [isExiting, setIsExiting] = useState(false);

  // Consent State Variables
  const [preferences, setPreferences] = useState({
    cookies: true,
    marketingEmails: true,
    updateNotifications: true,
    personalizedRecommendations: true,
  });

  // Configure panel open state
  const [showConfigure, setShowConfigure] = useState(false);

  useEffect(() => {
    const consentLogged = safeLocalStorage.getItem('siri_arts_consent_logged');
    if (!consentLogged) {
      // Show consent after user's first interaction (scroll/click/touch) + 1s buffer,
      // or after 20s fallback — whichever comes first.
      // This respects the critical first-impression trust formation window.
      let interactionTimer = null;
      let fallbackTimer = null;
      let fired = false;

      const showConsent = () => {
        if (fired) return;
        fired = true;
        cleanup();
        interactionTimer = setTimeout(() => setStep('cookie'), 1000);
      };

      const showConsentImmediate = () => {
        if (fired) return;
        fired = true;
        cleanup();
        setStep('cookie');
      };

      const cleanup = () => {
        window.removeEventListener('scroll', showConsent);
        window.removeEventListener('click', showConsent);
        window.removeEventListener('touchstart', showConsent);
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };

      window.addEventListener('scroll', showConsent, { once: true, passive: true });
      window.addEventListener('click', showConsent, { once: true });
      window.addEventListener('touchstart', showConsent, { once: true, passive: true });
      fallbackTimer = setTimeout(showConsentImmediate, 20000);

      return () => {
        cleanup();
        if (interactionTimer) clearTimeout(interactionTimer);
      };
    } else {
      try {
        const saved = JSON.parse(consentLogged);
        setTimeout(() => setPreferences(saved), 0);
      } catch (err) {
        logger.error('Failed to parse local consent logs', err);
      }
    }
  }, []);

  const dismissWithAnimation = useCallback((nextStep) => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      if (nextStep) {
        setStep(nextStep);
      } else {
        setStep('done');
      }
    }, 350);
  }, []);

  const handleSaveConsent = useCallback(
    async (finalPrefs, actionType) => {
      try {
        const consentToken = safeLocalStorage.getItem('siri_arts_consent_token') || '';

        const payload = {
          consentToken,
          cookies: finalPrefs.cookies,
          marketingEmails: finalPrefs.marketingEmails,
          updateNotifications: finalPrefs.updateNotifications,
          personalizedRecommendations: finalPrefs.personalizedRecommendations,
        };

        safeLocalStorage.setItem('siri_arts_consent_logged', JSON.stringify(finalPrefs));
        setPreferences(finalPrefs);

        if (finalPrefs.personalizedRecommendations || finalPrefs.marketingEmails) {
          import('../../utils/analytics')
            .then(({ initAnalytics }) => initAnalytics())
            .catch(() => {});
          import('../../utils/observability')
            .then(({ initObservability }) => initObservability())
            .catch(() => {});
        }

        // Proceed to notification step or close
        const notifAsked = safeLocalStorage.getItem('siri_arts_notif_asked');
        const supportsNotif = 'Notification' in window && Notification.permission === 'default';

        if (!notifAsked && supportsNotif) {
          dismissWithAnimation('notification');
        } else {
          dismissWithAnimation(null);
        }

        if (actionType === 'accept') {
          toast.success('Preferences saved. Cookies & alerts enabled.', {
            style: {
              background: '#1a1a1a',
              color: '#d4af37',
              border: '1px solid rgba(212,175,55,0.2)',
              fontSize: '12px',
            },
          });
        } else if (actionType === 'decline') {
          toast.success('Only essential cookies active.', {
            style: { fontSize: '12px' },
          });
        } else {
          toast.success('Preferences updated.', {
            style: { fontSize: '12px' },
          });
        }

        // Async save to backend
        notificationService
          .saveConsent(payload)
          .then((response) => {
            if (response && response.success) {
              safeLocalStorage.setItem('siri_arts_consent_token', response.data.consentToken);
            }
          })
          .catch((err) => {
            logger.error('Failed to persist consent to server:', err);
          });
      } catch (err) {
        logger.error('Unexpected error in handleSaveConsent:', err);
      }
    },
    [dismissWithAnimation],
  );

  const handleAcceptAll = useCallback(() => {
    const allAccepted = {
      cookies: true,
      marketingEmails: true,
      updateNotifications: true,
      personalizedRecommendations: true,
    };
    handleSaveConsent(allAccepted, 'accept');
  }, [handleSaveConsent]);

  const handleDeclineAll = useCallback(() => {
    const allDeclined = {
      cookies: true,
      marketingEmails: false,
      updateNotifications: false,
      personalizedRecommendations: false,
    };
    handleSaveConsent(allDeclined, 'decline');
  }, [handleSaveConsent]);

  const handleCustomSave = useCallback(() => {
    handleSaveConsent(preferences, 'custom');
  }, [handleSaveConsent, preferences]);

  // Browser Notification Permission
  const handleEnableNotifications = useCallback(async () => {
    safeLocalStorage.setItem('siri_arts_notif_asked', 'true');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled successfully.', {
          style: { fontSize: '12px' },
        });
      }
    } catch (err) {
      logger.error('Notification permission error:', err);
    }
    dismissWithAnimation(null);
  }, [dismissWithAnimation]);

  const handleSkipNotifications = useCallback(() => {
    safeLocalStorage.setItem('siri_arts_notif_asked', 'true');
    dismissWithAnimation(null);
  }, [dismissWithAnimation]);

  if (step === 'idle' || step === 'done') return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {/* COOKIE CONSENT BAR */}
      {step === 'cookie' && !isExiting && (
        <motion.div
          key="cookie-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[999999] px-3 pb-[calc(var(--bottom-nav-height,64px)+16px)] sm:px-4 md:px-6 md:pb-6"
        >
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/[0.06] rounded-xl shadow-[0_-8px_40px_rgba(0,0,0,0.3)] overflow-hidden">
              {/* Main Bar */}
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon + Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#d4af37]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.27 20.058l-1.278-1.278a.75.75 0 00-.06-.052c-.489-.399-.816-1.012-.816-1.728v-1.96a2.25 2.25 0 01-.053-.476V10.5a7.499 7.499 0 00-5.395-7.201A.75.75 0 0013.5 3a1.5 1.5 0 10-3 0 .75.75 0 00-.168.468A7.499 7.499 0 004.878 10.5v4.063a2.25 2.25 0 01-.053.476V17c0 .716-.327 1.329-.816 1.728a.75.75 0 00-.06.052L2.73 20.058A.75.75 0 003.28 21.31h17.44a.75.75 0 00.55-1.252zM14.25 21.75a2.25 2.25 0 01-4.5 0" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] sm:text-[13px] text-white/90 font-medium leading-snug">
                      We use cookies to personalize your experience, deliver festive offers, and
                      process orders.
                    </p>
                    <button
                      onClick={() => setShowConfigure(!showConfigure)}
                      className="text-[10px] text-[#d4af37]/70 hover:text-[#d4af37] font-medium mt-1 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{showConfigure ? 'Hide' : 'Manage'} preferences</span>
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${showConfigure ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleDeclineAll}
                    className="text-[10px] text-white/40 hover:text-white/70 font-medium transition-colors cursor-pointer px-2 py-1.5 whitespace-nowrap"
                  >
                    Decline
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAcceptAll}
                    className="bg-[#d4af37] hover:bg-[#c9a42e] text-[#111] px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-[0_2px_12px_rgba(212,175,55,0.25)] whitespace-nowrap flex-1 sm:flex-none text-center"
                  >
                    Accept All
                  </motion.button>
                </div>
              </div>

              {/* Expandable Configure Panel */}
              <AnimatePresence>
                {showConfigure && (
                  <motion.div
                    key="configure-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-white/[0.06] pt-3.5 space-y-3">
                      {/* Toggle Rows */}
                      {[
                        {
                          id: 'cookies',
                          label: 'Essential Cookies',
                          desc: 'Security, cart sessions, checkout. Always active.',
                          locked: true,
                          checked: true,
                        },
                        {
                          id: 'personalizedRecommendations',
                          label: 'Personalized Recommendations',
                          desc: 'Curated decor suggestions based on browsing.',
                          locked: false,
                          checked: preferences.personalizedRecommendations,
                        },
                        {
                          id: 'marketingEmails',
                          label: 'Marketing & Offers',
                          desc: 'Festive flash sales, new collection launches.',
                          locked: false,
                          checked: preferences.marketingEmails,
                        },
                        {
                          id: 'updateNotifications',
                          label: 'Order & Dispatch Alerts',
                          desc: 'Real-time shipping, delivery, and invoice updates.',
                          locked: false,
                          checked: preferences.updateNotifications,
                        },
                      ].map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
                            item.locked
                              ? 'bg-white/[0.03] cursor-default'
                              : 'bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer'
                          }`}
                        >
                          {/* Toggle Switch */}
                          <div className="relative shrink-0">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              disabled={item.locked}
                              onChange={(e) => {
                                if (!item.locked) {
                                  setPreferences((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.checked,
                                  }));
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div
                              className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                                item.checked ? 'bg-[#d4af37]' : 'bg-white/10'
                              } ${item.locked ? 'opacity-60' : ''}`}
                            />
                            <div
                              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                item.checked ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>

                          {/* Label Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-white/80 font-semibold">
                                {item.label}
                              </span>
                              {item.locked && (
                                <span className="text-[8px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  Required
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/30 leading-tight block">
                              {item.desc}
                            </span>
                          </div>
                        </label>
                      ))}

                      {/* Save Custom Button */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleCustomSave}
                          className="bg-white/10 hover:bg-white/15 text-white/90 px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          Save Preferences
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* BROWSER NOTIFICATION PROMPT */}
      {step === 'notification' && !isExiting && (
        <motion.div
          key="notif-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[999999] px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6"
        >
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/[0.06] rounded-xl shadow-[0_-8px_40px_rgba(0,0,0,0.3)]">
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon + Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] sm:text-[13px] text-white/90 font-medium leading-snug">
                      Enable notifications to get real-time order updates and exclusive flash sale
                      alerts.
                    </p>
                    <span className="text-[10px] text-white/30 mt-0.5 block">
                      You can disable this anytime from browser settings.
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleSkipNotifications}
                    className="text-[10px] text-white/40 hover:text-white/70 font-medium transition-colors cursor-pointer px-2 py-1.5 whitespace-nowrap"
                  >
                    Not now
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleEnableNotifications}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-[0_2px_12px_rgba(59,130,246,0.3)] whitespace-nowrap flex-1 sm:flex-none text-center"
                  >
                    Enable
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
