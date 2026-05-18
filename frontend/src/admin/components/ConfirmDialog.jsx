import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Reusable confirmation dialog for destructive actions.
 * Prevents accidental deletions, cancellations, and data loss.
 */
export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // "danger" | "warning" | "info"
  icon,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const variantConfig = {
    danger: {
      iconBg: "bg-rose-50 border-rose-100",
      iconColor: "text-rose-600",
      defaultIcon: "delete_forever",
      btnBg: "bg-rose-600 hover:bg-rose-700",
      btnText: "text-white",
    },
    warning: {
      iconBg: "bg-amber-50 border-amber-100",
      iconColor: "text-amber-600",
      defaultIcon: "warning",
      btnBg: "bg-amber-600 hover:bg-amber-700",
      btnText: "text-white",
    },
    info: {
      iconBg: "bg-slate-100 border-slate-200",
      iconColor: "text-black",
      defaultIcon: "info",
      btnBg: "bg-black hover:bg-slate-900",
      btnText: "text-white",
    },
  };

  const cfg = variantConfig[variant] || variantConfig.danger;

  // Handle Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200]"
            onClick={onCancel}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[90vw] max-w-[400px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
          >
            <div className="p-6 text-center">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} border flex items-center justify-center mx-auto mb-4`}>
                <span className={`material-symbols-outlined text-[24px] ${cfg.iconColor}`}>
                  {icon || cfg.defaultIcon}
                </span>
              </div>
              
              {/* Title */}
              <h3 
                id="confirm-dialog-title"
                className="text-[16px] font-semibold text-slate-900 mb-2"
              >
                {title}
              </h3>
              
              {/* Description */}
              {description && (
                <p 
                  id="confirm-dialog-desc"
                  className="text-[12px] text-slate-500 leading-relaxed max-w-[300px] mx-auto"
                >
                  {description}
                </p>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3 px-6 pb-6 justify-center">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-[12px] font-semibold uppercase tracking-wider hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                autoFocus
                className={`flex-1 px-4 py-2 ${cfg.btnBg} ${cfg.btnText} rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
