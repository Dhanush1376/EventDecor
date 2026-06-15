import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
              background: '#fdfbf7',
              color: '#2d2b29',
              border: '1px solid rgba(212,175,55,0.2)',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
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
            <div className="bg-[#fdfbf7]/[0.97] backdrop-blur-2xl border border-[#d4af37]/15 rounded-2xl shadow-[0_-8px_40px_rgba(115,92,0,0.10),0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              {/* Main Bar */}
              <div className="px-4 py-4 sm:px-5 sm:py-4.5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon + Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37]/15 to-[#f1d592]/20 border border-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-[18px] h-[18px] text-[#b8962e]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"
                        opacity="0"
                      />
                      <circle cx="6.5" cy="11.5" r="1.5" />
                      <circle cx="10" cy="7" r="1" />
                      <circle cx="15" cy="9.5" r="1.5" />
                      <circle cx="11.5" cy="14" r="1" />
                      <circle cx="16.5" cy="14" r="1" />
                      <path
                        d="M21.95 10.99c-1.79-.03-3.7-1.95-2.68-4.22-2.97 1-5.78-1.59-5.19-4.56C6.95.71 2 6.58 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-.34-.02-.67-.05-.99z"
                        opacity="0.15"
                      />
                      <path
                        d="M21.95 10.99c-1.79-.03-3.7-1.95-2.68-4.22-2.97 1-5.78-1.59-5.19-4.56C6.95.71 2 6.58 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-.34-.02-.67-.05-.99z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[12.5px] sm:text-[13.5px] text-[#2d2b29] font-medium leading-snug"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      We use cookies to personalize your experience, deliver festive offers, and
                      process orders.
                    </p>
                    <button
                      onClick={() => setShowConfigure(!showConfigure)}
                      className="text-[10.5px] text-[#b8962e] hover:text-[#8a6f1e] font-semibold mt-1.5 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{showConfigure ? 'Hide' : 'Manage'} preferences</span>
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${showConfigure ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleDeclineAll}
                    className="text-[10.5px] text-[#7f7663] hover:text-[#2d2b29] font-medium transition-colors cursor-pointer px-3 py-2 whitespace-nowrap rounded-lg hover:bg-[#f0ece4]"
                  >
                    Decline
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAcceptAll}
                    className="bg-gradient-to-r from-[#d4af37] to-[#c9a42e] hover:from-[#c9a42e] hover:to-[#b8962e] text-white px-5 py-2.5 rounded-xl text-[10.5px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-[0_2px_12px_rgba(212,175,55,0.25)] whitespace-nowrap flex-1 sm:flex-none text-center"
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
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-[#d4af37]/10 pt-3.5 space-y-2.5">
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
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors group ${
                            item.locked
                              ? 'bg-[#f4f0e6]/60 cursor-default'
                              : 'bg-[#f8f5ee]/40 hover:bg-[#f0ece4] cursor-pointer'
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
                                item.checked ? 'bg-[#d4af37]' : 'bg-[#d0c5af]/50'
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
                              <span className="text-[11px] text-[#2d2b29] font-semibold">
                                {item.label}
                              </span>
                              {item.locked && (
                                <span className="text-[8px] bg-[#d4af37]/10 text-[#8a6f1e] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  Required
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#7f7663] leading-tight block">
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
                          className="bg-[#2d2b29] hover:bg-[#1a1c1a] text-[#f8f5ee] px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
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
          className="fixed bottom-0 left-0 right-0 z-[999999] px-3 pb-[calc(var(--bottom-nav-height,64px)+16px)] sm:px-4 sm:pb-4 md:px-6 md:pb-6"
        >
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#fdfbf7]/[0.97] backdrop-blur-2xl border border-[#d4af37]/15 rounded-2xl shadow-[0_-8px_40px_rgba(115,92,0,0.10),0_2px_16px_rgba(0,0,0,0.06)]">
              <div className="px-4 py-4 sm:px-5 sm:py-4.5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon + Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37]/15 to-[#f1d592]/20 border border-[#d4af37]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-[18px] h-[18px] text-[#b8962e]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
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
                    <p
                      className="text-[12.5px] sm:text-[13.5px] text-[#2d2b29] font-medium leading-snug"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Enable notifications to get real-time order updates and exclusive flash sale
                      alerts.
                    </p>
                    <span className="text-[10px] text-[#7f7663] mt-0.5 block">
                      You can disable this anytime from browser settings.
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleSkipNotifications}
                    className="text-[10.5px] text-[#7f7663] hover:text-[#2d2b29] font-medium transition-colors cursor-pointer px-3 py-2 whitespace-nowrap rounded-lg hover:bg-[#f0ece4]"
                  >
                    Not now
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleEnableNotifications}
                    className="bg-gradient-to-r from-[#d4af37] to-[#c9a42e] hover:from-[#c9a42e] hover:to-[#b8962e] text-white px-5 py-2.5 rounded-xl text-[10.5px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-[0_2px_12px_rgba(212,175,55,0.25)] whitespace-nowrap flex-1 sm:flex-none text-center"
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
