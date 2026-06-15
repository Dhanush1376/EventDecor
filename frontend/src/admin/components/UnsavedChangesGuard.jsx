import { useEffect, useState } from 'react';

/**
 * A UI guard that works in tandem with useBlocker from react-router-dom
 * to show a custom modal when trying to navigate away with unsaved changes.
 */
export function UnsavedChangesGuard({ blocker }) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [blocker.state]);

  const handleConfirmLeave = () => {
    setShowPrompt(false);
    blocker.proceed();
  };

  const handleStay = () => {
    setShowPrompt(false);
    blocker.reset();
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="admin-card overflow-hidden max-w-sm w-full shadow-2xl relative bg-white"
        >
          {/* Header */}
          <div className="bg-red-50/80 border-b border-red-100 p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Unsaved Changes</h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            <p className="text-[13px] text-gray-600 leading-relaxed">
              You have unsaved changes that will be lost if you leave this page. Are you sure you
              want to discard them?
            </p>
            <p className="text-[12px] text-gray-500 mt-2 italic">
              Note: The auto-save system may have captured a draft, but it's best to explicitly save
              your work.
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 pt-0 flex items-center gap-3 justify-end bg-gray-50/50 mt-2 border-t border-gray-100">
            <button
              onClick={handleStay}
              className="admin-btn admin-btn-outline text-gray-700 bg-white"
            >
              Stay on Page
            </button>
            <button
              onClick={handleConfirmLeave}
              className="admin-btn admin-btn-destructive shadow-sm"
            >
              Leave & Discard
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
