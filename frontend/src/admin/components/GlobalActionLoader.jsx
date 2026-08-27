import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export function GlobalActionLoader() {
  const { globalActionLoading, globalActionMessage, globalActionSuccess } = useAdmin();

  return (
    <AnimatePresence>
      {(globalActionLoading || globalActionSuccess) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/60"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="flex flex-col items-center justify-center p-8 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] shadow-[var(--admin-shadow-lg)] max-w-sm w-full mx-4"
          >
            {globalActionSuccess ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-2 border border-green-500/20 text-green-500"
              >
                <span className="material-symbols-outlined text-[32px] font-bold">check</span>
              </motion.div>
            ) : (
              <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[var(--admin-accent-subtle)] mb-2">
                <Loader2
                  className="w-8 h-8 text-[var(--admin-accent)] animate-spin"
                  strokeWidth={2.5}
                />
              </div>
            )}

            <h3 className="mt-4 text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight text-center">
              {globalActionMessage || (globalActionSuccess ? 'Success!' : 'Processing...')}
            </h3>
            <p className="mt-1.5 text-[13px] font-medium text-[var(--admin-text-secondary)] text-center">
              {globalActionSuccess
                ? 'Your changes have been saved.'
                : 'Please wait while we complete your request.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
