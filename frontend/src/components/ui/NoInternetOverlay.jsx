import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Database, ShieldAlert, AlertCircle, Wifi, SignalHigh, SignalLow } from "lucide-react";
import { useNetwork } from "../../context/NetworkContext";

export function NoInternetOverlay() {
  const {
    networkState,
    connectionQuality,
    latency,
    pendingQueue,
    isSyncing,
    checkConnection,
  } = useNetwork();

  const [isVerifying, setIsVerifying] = useState(false);
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const retryButtonRef = useRef(null);

  // Focus lock and accessibility management
  useEffect(() => {
    if (networkState === 'offline') {
      // Store currently active element to restore focus later
      const previousActiveElement = document.activeElement;
      
      // Prevent body scrolling
      document.body.style.overflow = "hidden";
      
      // Set focus to the retry button
      setTimeout(() => {
        retryButtonRef.current?.focus();
      }, 300);

      return () => {
        document.body.style.overflow = "";
        previousActiveElement?.focus();
      };
    }
  }, [networkState]);

  const handleManualRetry = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    
    // Simulate interactive premium verification speed
    const checkResult = await Promise.all([
      checkConnection(),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);

    setIsVerifying(false);
  };

  // Keyboard navigation listener (close overlay on Escape or trigger retry on space/enter if focused)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (networkState !== 'offline') return;
      if (e.key === "Escape") {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [networkState]);


  return (
    <AnimatePresence>
      {networkState === 'offline' && (
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="offline-title"
          aria-describedby="offline-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-surface/90 backdrop-blur-xl"
        >
          {/* Luxury Gold/Champagne Background Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] bg-primary-fixed/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-champagne/20 rounded-full blur-[140px] animate-[pulse_8s_infinite]" />
          </div>

          {/* Outer Premium Card */}
          <motion.div
            initial={{ scale: 0.92, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 15, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="relative w-full max-w-lg overflow-hidden glass rounded-3xl p-8 md:p-12 text-center shadow-luxury border-outline-variant/40"
          >
            {/* Animated WiFi-Off Illustration */}
            <div className="relative flex items-center justify-center w-28 h-28 mx-auto mb-8">
              {/* Pulsing Backlight */}
              <div className="absolute inset-0 bg-primary-fixed/20 rounded-full blur-2xl animate-pulse" />
              
              {/* Concentric Signal Rings */}
              <motion.div 
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute w-24 h-24 border border-primary/20 rounded-full" 
              />
              <motion.div 
                animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                className="absolute w-28 h-28 border border-primary/10 rounded-full" 
              />

              {/* WiFi Off Icon and Slash container */}
              <div className="relative w-16 h-16 flex items-center justify-center bg-surface-bright border border-outline-variant/30 rounded-2xl shadow-sm text-primary">
                <WifiOff className="w-8 h-8 text-primary" strokeWidth={1.5} />
                
                {/* Gold Slash Stripe */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "125%" }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="absolute h-[2px] bg-gradient-to-r from-primary-container via-primary to-primary-container origin-left left-[-12%] top-[48%] rotate-45 rounded-full"
                />
              </div>
            </div>

            {/* Typography */}
            <h1 
              id="offline-title" 
              className="font-display font-medium text-3xl md:text-4xl text-on-surface mb-3 tracking-tight"
            >
              You’re offline
            </h1>
            <p 
              id="offline-desc" 
              className="font-body text-sm md:text-base text-on-surface-variant/80 max-w-sm mx-auto mb-8 leading-relaxed"
            >
              Please check your internet connection and try again. Your offline activity is protected and will sync automatically.
            </p>

            {/* Connection Status Details */}
            <div className="flex items-center justify-center gap-6 mb-8 text-[11px] font-label uppercase tracking-widest text-on-surface-variant/60">
              <span className="flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-stone-400" />
                Status: Offline
              </span>
              <div className="w-[1px] h-3 bg-outline-variant/30" />
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                Secured: Yes
              </span>
            </div>

            {/* Queue Status Panel (Premium LocalStorage Actions Indicator) */}
            {pendingQueue.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mb-8 overflow-hidden"
              >
                <div className="bg-surface-container/60 border border-outline-variant/25 rounded-2xl p-4 text-left">
                  <button
                    onClick={() => setShowQueueDetails(!showQueueDetails)}
                    className="w-full flex items-center justify-between font-label-md text-xs tracking-wider text-on-surface-variant font-bold cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary animate-pulse" />
                      {pendingQueue.length} PENDING SYNC ACTION(S)
                    </span>
                    <span className="text-[10px] text-primary underline">
                      {showQueueDetails ? "Hide" : "Show"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showQueueDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-2 border-t border-outline-variant/20 pt-3 max-h-[120px] overflow-y-auto custom-scrollbar"
                      >
                        {pendingQueue.map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between text-[11px] text-on-surface-variant/80 font-body py-1 border-b border-outline-variant/10 last:border-0"
                          >
                            <span className="font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-primary-container" />
                              {item.description}
                            </span>
                            <span className="text-[9px] font-label text-stone-400 bg-surface px-1.5 py-0.5 rounded border border-outline-variant/10">
                              Queued
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Button actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <button
                ref={retryButtonRef}
                onClick={handleManualRetry}
                disabled={isVerifying}
                className={`w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 btn-primary py-3.5 ${
                  isVerifying ? "opacity-90 pointer-events-none bg-primary-container text-on-primary-container" : ""
                }`}
              >
                <RefreshCw 
                  className={`w-4 h-4 tracking-widest ${isVerifying ? "animate-spin" : ""}`} 
                  strokeWidth={2}
                />
                {isVerifying ? "Verifying..." : "Verify Connection"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
