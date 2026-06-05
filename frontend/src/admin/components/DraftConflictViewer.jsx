import { motion, AnimatePresence } from 'framer-motion';

export function DraftConflictViewer({
  isOpen,
  serverData,
  draftData,
  onKeepServer,
  onKeepDraft,
  moduleName,
}) {
  if (!isOpen) return null;

  // Utility to stringify safely for simple comparison
  const safeString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="admin-card overflow-hidden max-w-2xl w-full shadow-2xl bg-white flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">compare_arrows</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Version Conflict Detected
                </h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  The live version of this {moduleName?.toLowerCase() || 'item'} is newer than your
                  saved draft.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
            <div className="grid grid-cols-2 gap-4">
              {/* Server Version Column */}
              <div className="admin-card p-0 border-emerald-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Live Server Version
                  </span>
                </div>
                <div className="p-3 text-xs text-slate-700 font-mono space-y-2 overflow-x-auto">
                  {Object.keys(serverData || {})
                    .slice(0, 8)
                    .map((key) => (
                      <div key={key} className="break-all">
                        <span className="text-slate-400 select-none">{key}: </span>
                        <span className="text-emerald-700 font-medium">
                          {safeString(serverData[key])}
                        </span>
                      </div>
                    ))}
                  {Object.keys(serverData || {}).length > 8 && (
                    <div className="text-slate-400 italic">...and more fields</div>
                  )}
                </div>
              </div>

              {/* Draft Version Column */}
              <div className="admin-card p-0 border-amber-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-amber-50 px-3 py-2 border-b border-amber-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Your Local Draft
                  </span>
                </div>
                <div className="p-3 text-xs text-slate-700 font-mono space-y-2 overflow-x-auto">
                  {Object.keys(draftData || {})
                    .slice(0, 8)
                    .map((key) => {
                      const serverVal = safeString(serverData?.[key]);
                      const draftVal = safeString(draftData[key]);
                      const isDiff = serverVal !== draftVal;
                      return (
                        <div
                          key={key}
                          className={`break-all ${isDiff ? 'bg-amber-100/50 p-0.5 rounded -mx-0.5 px-1' : ''}`}
                        >
                          <span className="text-slate-400 select-none">{key}: </span>
                          <span
                            className={isDiff ? 'text-amber-700 font-medium' : 'text-slate-600'}
                          >
                            {draftVal}
                          </span>
                        </div>
                      );
                    })}
                  {Object.keys(draftData || {}).length > 8 && (
                    <div className="text-slate-400 italic">...and more fields</div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              Choosing to keep your draft will overwrite the live server version when you save.
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center gap-3 justify-end shrink-0">
            <button
              onClick={onKeepServer}
              className="admin-btn admin-btn-outline text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-base text-emerald-600">download</span>
              Use Live Version (Discard Draft)
            </button>
            <button
              onClick={onKeepDraft}
              className="admin-btn admin-btn-primary shadow-sm bg-slate-800 hover:bg-slate-900 text-white border-transparent"
            >
              <span className="material-symbols-outlined text-base">edit_document</span>
              Keep My Draft
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
