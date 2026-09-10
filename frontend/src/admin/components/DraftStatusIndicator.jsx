import { m as motion, AnimatePresence } from 'framer-motion';
export function DraftStatusIndicator({ status, lastSavedAt, compact = false }) {
  // status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

  if (status === 'idle') return null;

  const config = {
    saving: {
      text: compact ? 'Saving...' : 'Saving draft...',
      icon: 'sync',
      color: 'text-slate-500',
      dotColor: 'bg-slate-400',
      animateClass: 'animate-spin-slow',
      pulse: true,
    },
    saved: {
      text: compact
        ? 'Saved'
        : lastSavedAt
          ? `Draft saved at ${new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(lastSavedAt))}`
          : 'Draft saved',
      icon: 'cloud_done',
      color: 'text-emerald-600',
      dotColor: 'bg-emerald-500',
      animateClass: '',
      pulse: false,
    },
    unsaved: {
      text: 'Unsaved',
      icon: 'edit_document',
      color: 'text-amber-600',
      dotColor: 'bg-amber-500',
      animateClass: '',
      pulse: false,
    },
    error: {
      text: compact ? 'Failed' : 'Failed to save draft',
      icon: 'error',
      color: 'text-red-500',
      dotColor: 'bg-red-500',
      animateClass: '',
      pulse: false,
    },
  };

  const current = config[status];
  if (!current) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center rounded-full bg-white dark:bg-[var(--admin-surface)] border border-gray-100 dark:border-[var(--admin-border)] shadow-xs ${
          compact ? 'gap-1.5 px-2 py-0.5' : 'gap-2 px-3 py-1.5'
        }`}
      >
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          {current.pulse && (
            <span
              className={`absolute w-full h-full rounded-full ${current.dotColor} opacity-30 animate-ping`}
            />
          )}
          <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />
        </div>

        <span
          className={`font-medium tracking-wide ${current.color} ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {current.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
