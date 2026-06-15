import React from 'react';

/**
 * Reusable confirmation dialog for destructive actions.
 * Prevents accidental deletions, cancellations, and data loss.
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // "danger" | "warning" | "info"
  icon,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const variantConfig = {
    danger: {
      iconBg: 'var(--admin-error-light)',
      iconBorder: 'var(--admin-error-border)',
      iconColor: 'var(--admin-error)',
      defaultIcon: 'delete_forever',
      btnBg: 'var(--admin-error)',
      btnHover: '#DC2626',
    },
    warning: {
      iconBg: 'var(--admin-warning-light)',
      iconBorder: 'var(--admin-warning-border)',
      iconColor: 'var(--admin-warning)',
      defaultIcon: 'warning',
      btnBg: 'var(--admin-warning)',
      btnHover: '#B45309',
    },
    info: {
      iconBg: 'var(--admin-surface-muted)',
      iconBorder: 'var(--admin-border)',
      iconColor: 'var(--admin-text-primary)',
      defaultIcon: 'info',
      btnBg: 'var(--admin-text-primary)',
      btnHover: '#27272A',
    },
  };

  const cfg = variantConfig[variant] || variantConfig.danger;

  // Handle Escape key
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
            className="fixed inset-0 z-[200]"
            style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[90vw] max-w-[400px] overflow-hidden"
            style={{
              background: 'var(--admin-surface)',
              borderRadius: 'var(--admin-radius-xl)',
              boxShadow: 'var(--admin-shadow-overlay)',
              border: '1px solid var(--admin-border)',
            }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
          >
            <div className="p-6 text-center">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-[var(--admin-radius-xl)] flex items-center justify-center mx-auto mb-4"
                style={{
                  background: cfg.iconBg,
                  border: `1px solid ${cfg.iconBorder}`,
                }}
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ color: cfg.iconColor }}
                >
                  {icon || cfg.defaultIcon}
                </span>
              </div>

              {/* Title */}
              <h3
                id="confirm-dialog-title"
                className="text-[16px] font-semibold mb-2"
                style={{ color: 'var(--admin-text-primary)' }}
              >
                {title}
              </h3>

              {/* Description */}
              {description && (
                <p
                  id="confirm-dialog-desc"
                  className="text-[12px] leading-relaxed max-w-[300px] mx-auto"
                  style={{ color: 'var(--admin-text-tertiary)' }}
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
                className="admin-btn admin-btn-outline flex-1 text-[12px] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                autoFocus
                className="admin-btn flex-1 text-[12px] text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: cfg.btnBg,
                  borderColor: cfg.btnBg,
                }}
              >
                {loading ? (
                  <>
                    <div className="admin-skeleton inline-block w-3.5 h-3.5 rounded-full" />
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
