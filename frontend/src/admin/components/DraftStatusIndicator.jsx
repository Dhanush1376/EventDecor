export function DraftStatusIndicator({ status, lastSavedAt }) {
  // status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

  if (status === 'idle') return null;

  const config = {
    saving: {
      text: 'Saving draft...',
      icon: 'sync',
      color: 'text-slate-500',
      dotColor: 'bg-slate-400',
      animateClass: 'animate-spin-slow',
      pulse: true,
    },
    saved: {
      text: lastSavedAt
        ? `Draft saved at ${new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(lastSavedAt))}`
        : 'Draft saved',
      icon: 'cloud_done',
      color: 'text-emerald-600',
      dotColor: 'bg-emerald-500',
      animateClass: '',
      pulse: false,
    },
    unsaved: {
      text: 'Unsaved changes',
      icon: 'edit_document',
      color: 'text-amber-600',
      dotColor: 'bg-amber-500',
      animateClass: '',
      pulse: false,
    },
    error: {
      text: 'Failed to save draft',
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm"
      >
        <div className="relative flex items-center justify-center w-3 h-3">
          {current.pulse && (
            <span
              className={`absolute w-full h-full rounded-full ${current.dotColor} opacity-30 animate-ping`}
            />
          )}
          <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />
        </div>

        <span className={`text-[11px] font-medium tracking-wide ${current.color}`}>
          {current.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
