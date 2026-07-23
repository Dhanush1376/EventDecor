import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export function GlobalActionLoader() {
  const { globalActionLoading, globalActionMessage } = useAdmin();

  return (
    <AnimatePresence>
      {globalActionLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="flex flex-col items-center justify-center p-8 bg-white/10 dark:bg-black/20 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md max-w-sm w-full mx-4"
          >
            <div className="relative">
              <Loader2 className="w-12 h-12 text-white animate-spin" strokeWidth={1.5} />
              <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping pointer-events-none" />
            </div>

            <h3 className="mt-6 text-lg font-semibold text-white tracking-wide text-center">
              {globalActionMessage || 'Processing...'}
            </h3>
            <p className="mt-2 text-sm text-white/70 text-center">
              Please wait while we complete your request.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
