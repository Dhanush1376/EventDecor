import { motion, AnimatePresence } from 'framer-motion';

export function DraftRestoreModal({ isOpen, onRestore, onDiscard, moduleName, lastSavedAt }) {
  if (!isOpen) return null;

  const formattedDate = lastSavedAt
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lastSavedAt))
    : 'recently';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="admin-card overflow-hidden max-w-md w-full shadow-2xl relative"
        >
          {/* Header */}
          <div className="bg-amber-50/50 border-b border-amber-100 p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">restore_page</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Draft Found</h3>
                <p className="text-xs text-amber-700/80 font-medium mt-0.5">
                  Unsaved changes detected
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            <p className="text-[13px] text-gray-600 leading-relaxed">
              We found unsaved changes for{' '}
              <strong className="text-gray-900 font-semibold">{moduleName}</strong> from your
              previous session. Would you like to restore this draft and continue where you left
              off?
            </p>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-sm">schedule</span>
              <span className="text-xs text-gray-500">
                Last saved: <span className="font-medium text-gray-700">{formattedDate}</span>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 pt-0 flex items-center gap-3 justify-end">
            <button
              onClick={onDiscard}
              className="admin-btn admin-btn-ghost text-gray-500 hover:text-gray-700"
            >
              Discard Draft
            </button>
            <button onClick={onRestore} className="admin-btn admin-btn-primary shadow-sm">
              <span className="material-symbols-outlined text-lg">restore</span>
              Restore Draft
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
