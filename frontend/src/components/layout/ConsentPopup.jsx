import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationService } from "../../services/domainServices";
import toast from "react-hot-toast";

export function ConsentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [view, setView] = useState("banner"); // 'banner' | 'details'
  
  // Consent State Variables
  const [preferences, setPreferences] = useState({
    cookies: true,
    marketingEmails: true,
    updateNotifications: true,
    personalizedRecommendations: true,
  });

  useEffect(() => {
    // Check if user has already made a preference selection
    const consentLogged = localStorage.getItem("siri_arts_consent_logged");
    if (!consentLogged) {
      // Small delay before showing banner for ultra-smooth presentation
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    } else {
      // Sync loaded choices from localStorage
      try {
        const saved = JSON.parse(consentLogged);
        setPreferences(saved);
      } catch (err) {
        console.error("Failed to parse local consent logs", err);
      }
    }
  }, []);

  const handleSaveConsent = async (finalPrefs, actionType) => {
    try {
      const consentToken = localStorage.getItem("siri_arts_consent_token") || "";
      
      const payload = {
        consentToken,
        cookies: finalPrefs.cookies,
        marketingEmails: finalPrefs.marketingEmails,
        updateNotifications: finalPrefs.updateNotifications,
        personalizedRecommendations: finalPrefs.personalizedRecommendations,
      };

      const response = await notificationService.saveConsent(payload);
      if (response && response.success) {
        const savedPrefs = {
          cookies: response.data.cookies,
          marketingEmails: response.data.marketingEmails,
          updateNotifications: response.data.updateNotifications,
          personalizedRecommendations: response.data.personalizedRecommendations,
        };
        
        // Persist token & selections locally
        localStorage.setItem("siri_arts_consent_token", response.data.consentToken);
        localStorage.setItem("siri_arts_consent_logged", JSON.stringify(savedPrefs));
        setPreferences(savedPrefs);
        
        if (actionType === "accept") {
          toast.success("Thank you for accepting Siri Arts cookies & alerts!", {
            icon: "✦",
            style: {
              background: "#faf9f6",
              color: "#735c00",
              border: "1px solid #d0c5af",
              fontFamily: "'Playfair Display', serif",
            },
          });
        } else {
          toast.success("Preferences updated successfully");
        }
      }
    } catch (err) {
      console.error("Failed to persist GDPR consent selection:", err);
      // Fallback local-only save on offline or network failure
      localStorage.setItem("siri_arts_consent_logged", JSON.stringify(finalPrefs));
    } finally {
      setIsVisible(false);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      cookies: true,
      marketingEmails: true,
      updateNotifications: true,
      personalizedRecommendations: true,
    };
    handleSaveConsent(allAccepted, "accept");
  };

  const handleDeclineAll = () => {
    const allDeclined = {
      cookies: true, // Core functionality stays true
      marketingEmails: false,
      updateNotifications: false,
      personalizedRecommendations: false,
    };
    handleSaveConsent(allDeclined, "decline");
  };

  const handleCustomSave = () => {
    handleSaveConsent(preferences, "custom");
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center p-4 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="pointer-events-auto w-full max-w-xl md:max-w-2xl bg-white/80 backdrop-blur-xl border border-[#735c00]/15 shadow-[0_20px_50px_rgba(115,92,0,0.1)] rounded-2xl p-5 sm:p-6 text-on-surface"
        >
          {view === "banner" ? (
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2.5">
                  <span className="material-symbols-outlined text-[#735c00] text-xl animate-pulse">
                    verified_user
                  </span>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-[#735c00] font-sans">
                    Artistry & Privacy Choices
                  </h3>
                </div>
                
                <h2 className="text-sm font-bold font-serif text-zinc-900 leading-snug mb-2">
                  Enhance your Siri Arts Curation & Updates
                </h2>
                
                <p className="text-[11px] text-zinc-600 font-light leading-relaxed">
                  We use cookies and notification channels to elevate your design journey. 
                  Accepting lets us recommend hand-carved urlis, notify you of festive flash offers, 
                  and dispatch real-time order status updates to your screen.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAcceptAll}
                  className="bg-[#735c00] text-white rounded-full px-5 py-2.5 font-sans font-bold text-[9px] uppercase tracking-widest hover:bg-zinc-900 transition-colors shadow-md cursor-pointer text-center"
                >
                  Accept All
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("details")}
                  className="border border-[#735c00]/30 hover:border-[#735c00] text-[#735c00] rounded-full px-5 py-2.5 font-sans font-bold text-[9px] uppercase tracking-widest transition-colors cursor-pointer text-center"
                >
                  Configure
                </motion.button>
                
                <button
                  onClick={handleDeclineAll}
                  className="text-[10px] text-zinc-400 hover:text-zinc-900 transition-colors font-medium cursor-pointer text-center py-1 font-sans"
                >
                  Decline Non-Essential
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#735c00]/10 pb-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setView("banner")} 
                    className="material-symbols-outlined text-zinc-400 hover:text-[#735c00] text-lg cursor-pointer"
                  >
                    arrow_back
                  </button>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-[#735c00] font-sans">
                    Detailed Consent Settings
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-400 font-sans">GDPR & ePrivacy Compliant</span>
              </div>

              {/* Preferences Grid */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                
                {/* Preference 1: Essential Cookies */}
                <div className="flex items-start gap-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      disabled
                      checked
                      aria-label="Core Platform Operations (Always Active)"
                      className="w-4 h-4 rounded text-[#735c00] border-zinc-300 focus:ring-[#735c00] cursor-not-allowed accent-[#735c00]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-[11px] font-bold text-zinc-950 font-sans">Core Platform Operations (Always Active)</strong>
                      <span className="text-[8px] bg-zinc-200 text-zinc-700 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-sans">Required</span>
                    </div>
                    <p className="text-[9.5px] text-zinc-500 font-light leading-relaxed mt-0.5">
                      Enables checkout bag sessions, security keys, and fundamental order processing databases. Without these, the atelier portal cannot function.
                    </p>
                  </div>
                </div>

                {/* Preference 2: Personalized Recommendations */}
                <div className="flex items-start gap-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl hover:border-[#735c00]/25 transition-colors">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      id="consent-recs"
                      checked={preferences.personalizedRecommendations}
                      onChange={(e) => setPreferences({ ...preferences, personalizedRecommendations: e.target.checked })}
                      className="w-4 h-4 rounded text-[#735c00] border-zinc-300 focus:ring-[#735c00] cursor-pointer accent-[#735c00]"
                    />
                  </div>
                  <label htmlFor="consent-recs" className="flex-1 cursor-pointer">
                    <strong className="text-[11px] font-bold text-zinc-950 font-sans">Personalized Design Recommendations</strong>
                    <p className="text-[9.5px] text-zinc-500 font-light leading-relaxed mt-0.5">
                      Allows us to analyze your decor views (like brass backdrops vs diyas) to recommend harmonious design elements.
                    </p>
                  </label>
                </div>

                {/* Preference 3: Marketing Emails */}
                <div className="flex items-start gap-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl hover:border-[#735c00]/25 transition-colors">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      id="consent-marketing"
                      checked={preferences.marketingEmails}
                      onChange={(e) => setPreferences({ ...preferences, marketingEmails: e.target.checked })}
                      className="w-4 h-4 rounded text-[#735c00] border-zinc-300 focus:ring-[#735c00] cursor-pointer accent-[#735c00]"
                    />
                  </div>
                  <label htmlFor="consent-marketing" className="flex-1 cursor-pointer">
                    <strong className="text-[11px] font-bold text-zinc-950 font-sans">Festive Offers & Catalog Email Updates</strong>
                    <p className="text-[9.5px] text-zinc-500 font-light leading-relaxed mt-0.5">
                      Receive visually stunning, gold-branded marketing catalogs, limited collection releases, and flash holiday promo codes (e.g. 50% Off).
                    </p>
                  </label>
                </div>

                {/* Preference 4: Update Notifications */}
                <div className="flex items-start gap-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl hover:border-[#735c00]/25 transition-colors">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      id="consent-updates"
                      checked={preferences.updateNotifications}
                      onChange={(e) => setPreferences({ ...preferences, updateNotifications: e.target.checked })}
                      className="w-4 h-4 rounded text-[#735c00] border-zinc-300 focus:ring-[#735c00] cursor-pointer accent-[#735c00]"
                    />
                  </div>
                  <label htmlFor="consent-updates" className="flex-1 cursor-pointer">
                    <strong className="text-[11px] font-bold text-zinc-950 font-sans">Order Logs & Dispatch Tracking Alerts</strong>
                    <p className="text-[9.5px] text-zinc-500 font-light leading-relaxed mt-0.5">
                      Receive real-time transactional dispatches on order placement, invoice pdf generation, courier dispatch, and delivery milestones.
                    </p>
                  </label>
                </div>

              </div>

              {/* Preferences Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#735c00]/10 pt-4">
                <button
                  onClick={handleDeclineAll}
                  className="text-[10px] text-zinc-400 hover:text-zinc-950 font-medium cursor-pointer font-sans"
                >
                  Decline All Optional
                </button>

                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCustomSave}
                    className="bg-[#735c00] text-white rounded-full px-5 py-2.5 font-sans font-bold text-[9px] uppercase tracking-widest hover:bg-zinc-900 transition-colors shadow-sm cursor-pointer text-center flex-1 sm:flex-none"
                  >
                    Commit My Preferences
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAcceptAll}
                    className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-full px-5 py-2.5 font-sans font-bold text-[9px] uppercase tracking-widest transition-colors cursor-pointer text-center flex-1 sm:flex-none"
                  >
                    Accept All
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
